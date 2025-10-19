/**
 * EPUB文件解析工具
 * 使用简单的EPUB解压和XML解析
 */
const fs = require('fs')
const path = require('path')
const JSZip = require('jszip')
const xml2js = require('xml2js')

/**
 * 解析EPUB文件并提取文本内容和章节信息
 * @param {string} filePath EPUB文件路径
 * @returns {Promise<Object>} 包含书籍信息、文本内容和章节列表的对象
 */
async function parseEpub(filePath) {
  try {
    console.log(`开始解析EPUB文件: ${filePath}`)
    
    // 读取EPUB文件
    const epubData = fs.readFileSync(filePath)
    
    // 使用JSZip解压EPUB
    const zip = await JSZip.loadAsync(epubData)
    
    // 解析容器文件获取OPF文件路径
    const containerXml = await zip.file('META-INF/container.xml').async('text')
    const container = await parseXml(containerXml)
    const opfPath = container.container.rootfiles[0].rootfile[0].$['full-path']
    console.log(`OPF文件路径: ${opfPath}`)
    
    // 解析OPF文件获取书籍信息和章节列表
    const opfXml = await zip.file(opfPath).async('text')
    const opf = await parseXml(opfXml)
    
    // 获取书籍元数据
    const metadata = opf.package.metadata[0]
    const title = metadata['dc:title'] ? metadata['dc:title'][0] : path.basename(filePath, '.epub')
    console.log(`书籍标题: ${title}`)
    
    // 获取章节列表
    const spine = opf.package.spine[0]
    const manifest = opf.package.manifest[0].item
    
    // 构建章节路径映射
    const manifestMap = {}
    manifest.forEach(item => {
      manifestMap[item.$.id] = path.join(path.dirname(opfPath), item.$.href)
    })
    
    // 按spine顺序获取章节内容
    const spineItems = spine.itemref
    let fullContent = ''
    let chapters = [] // 章节信息列表
    let currentPosition = 0 // 当前文本位置
    
    console.log(`总章节数: ${spineItems.length}`)
    
    // 先尝试直接读取text目录下的所有HTML文件
    let textFiles = []
    zip.forEach((relativePath, file) => {
      if (relativePath.startsWith('text/') && 
          (relativePath.endsWith('.html') || relativePath.endsWith('.xhtml'))) {
        textFiles.push(relativePath)
      }
    })
    
    console.log(`找到的文本文件: ${textFiles.length}个`)
    
    // 如果通过text目录找到文件，优先使用这些文件
    if (textFiles.length > 0) {
      for (const textFile of textFiles) {
        try {
          const chapterContent = await zip.file(textFile).async('text')
          const textContent = extractTextFromHtml(chapterContent)
          if (textContent.trim().length > 0) {
            // 记录章节信息（包含层级）
            const chapterInfo = extractChapterInfo(chapterContent)
            chapters.push({
              title: chapterInfo.title || `第${chapters.length + 1}章`,
              level: chapterInfo.level,
              position: currentPosition,
              length: textContent.length
            })
            
            // 调试信息：打印章节层级
            console.log(`章节 ${chapters.length}: 标题="${chapterInfo.title}", 层级=${chapterInfo.level}, 位置=${currentPosition}`)
            
            fullContent += textContent + '\n\n'
            currentPosition += textContent.length + 2 // 加上换行符长度
            
            console.log(`文件 ${textFile} 内容长度: ${textContent.length}`)
          }
        } catch (error) {
          console.warn(`文件 ${textFile} 解析失败:`, error.message)
        }
      }
    } else {
      // 回退到使用spine顺序
      for (const spineItem of spineItems) {
        const itemId = spineItem.$.idref
        const chapterPath = manifestMap[itemId]
        
        if (chapterPath && zip.file(chapterPath)) {
          try {
            const chapterContent = await zip.file(chapterPath).async('text')
            const textContent = extractTextFromHtml(chapterContent)
            if (textContent.trim().length > 0) {
              // 记录章节信息（包含层级）
              const chapterInfo = extractChapterInfo(chapterContent)
              chapters.push({
                title: chapterInfo.title || `第${chapters.length + 1}章`,
                level: chapterInfo.level,
                position: currentPosition,
                length: textContent.length
              })
              
              // 调试信息：打印章节层级
              console.log(`章节 ${chapters.length}: 标题="${chapterInfo.title}", 层级=${chapterInfo.level}, 位置=${currentPosition}`)
              
              fullContent += textContent + '\n\n'
              currentPosition += textContent.length + 2 // 加上换行符长度
              
              console.log(`章节 ${itemId} 内容长度: ${textContent.length}`)
            }
          } catch (error) {
            console.warn(`章节 ${itemId} 解析失败:`, error.message)
          }
        }
      }
    }
    
    // 如果内容仍然为空，尝试直接读取所有HTML文件
    if (fullContent.trim().length === 0) {
      console.log('尝试读取所有HTML文件...')
      let htmlFiles = []
      zip.forEach((relativePath, file) => {
        if (relativePath.endsWith('.html') || relativePath.endsWith('.xhtml')) {
          htmlFiles.push(relativePath)
        }
      })
      
      for (const htmlFile of htmlFiles) {
        try {
          const chapterContent = await zip.file(htmlFile).async('text')
          const textContent = extractTextFromHtml(chapterContent)
          if (textContent.trim().length > 0) {
            // 记录章节信息（包含层级）
            const chapterInfo = extractChapterInfo(chapterContent)
            chapters.push({
              title: chapterInfo.title || `第${chapters.length + 1}章`,
              level: chapterInfo.level,
              position: currentPosition,
              length: textContent.length
            })
            
            // 调试信息：打印章节层级
            console.log(`章节 ${chapters.length}: 标题="${chapterInfo.title}", 层级=${chapterInfo.level}, 位置=${currentPosition}`)
            
            fullContent += textContent + '\n\n'
            currentPosition += textContent.length + 2 // 加上换行符长度
          }
        } catch (error) {
          console.warn(`文件 ${htmlFile} 解析失败:`, error.message)
        }
      }
    }
    
    console.log(`解析完成，总内容长度: ${fullContent.length}`)
    console.log(`提取到章节数: ${chapters.length}`)
    
    // 打印所有章节的层级分布
    const levelDistribution = {}
    chapters.forEach(chapter => {
      levelDistribution[chapter.level] = (levelDistribution[chapter.level] || 0) + 1
    })
    console.log('章节层级分布:', levelDistribution)
    
    const bookInfo = {
      title: title,
      path: filePath,
      size: fullContent.length,
      type: 'epub',
      metadata: metadata,
      chapters: chapters // 添加章节信息
    }
    
    return {
      bookInfo: bookInfo,
      content: fullContent.trim(),
      chapters: chapters
    }
    
  } catch (error) {
    console.error(`EPUB文件解析失败: ${error.message}`)
    throw new Error(`EPUB文件解析失败: ${error.message}`)
  }
}

/**
 * 解析XML内容
 */
function parseXml(xmlContent) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xmlContent, { explicitArray: true }, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

/**
 * 从HTML内容中提取纯文本 - 简化版本
 * @param {string} html HTML内容
 * @returns {string} 纯文本内容
 */
function extractTextFromHtml(html) {
  if (!html) return ''
  
  try {
    // 移除XML声明和DOCTYPE
    let text = html.replace(/<\?xml[^>]*\?>/g, '')
    text = text.replace(/<!DOCTYPE[^>]*>/g, '')
    
    // 移除所有注释
    text = text.replace(/<!--[\s\S]*?-->/g, '')
    
    // 移除script和style标签
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    
    // 处理特殊字符实体
    text = text.replace(/&nbsp;/g, ' ')
    text = text.replace(/&/g, '&')
    text = text.replace(/</g, '<')
    text = text.replace(/>/g, '>')
    text = text.replace(/"/g, '"')
    text = text.replace(/&#39;/g, "'")
    text = text.replace(/&#x([0-9a-f]+);/gi, (match, code) => String.fromCharCode(parseInt(code, 16)))
    text = text.replace(/&#(\d+);/g, (match, code) => String.fromCharCode(parseInt(code, 10)))
    
    // 移除所有HTML标签，但保留文本内容
    text = text.replace(/<[^>]+>/g, ' ')
    
    // 清理空白字符
    text = text.replace(/\s+/g, ' ')
    text = text.trim()
    
    return text
    
  } catch (error) {
    console.warn('HTML文本提取失败:', error)
    // 如果提取失败，尝试简单去除标签
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

/**
 * 从HTML内容中提取章节标题和层级信息
 * @param {string} html HTML内容
 * @returns {Object} 包含标题和层级的对象
 */
function extractChapterInfo(html) {
  if (!html) return { title: '', level: 0 }
  
  try {
    // 尝试从h1-h6标签中提取标题和层级
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    if (h1Match) return { title: h1Match[1].trim(), level: 1 }
    
    const h2Match = html.match(/<h2[^>]*>([^<]+)<\/h2>/i)
    if (h2Match) return { title: h2Match[1].trim(), level: 2 }
    
    const h3Match = html.match(/<h3[^>]*>([^<]+)<\/h3>/i)
    if (h3Match) return { title: h3Match[1].trim(), level: 3 }
    
    const h4Match = html.match(/<h4[^>]*>([^<]+)<\/h4>/i)
    if (h4Match) return { title: h4Match[1].trim(), level: 4 }
    
    const h5Match = html.match(/<h5[^>]*>([^<]+)<\/h5>/i)
    if (h5Match) return { title: h5Match[1].trim(), level: 5 }
    
    const h6Match = html.match(/<h6[^>]*>([^<]+)<\/h6>/i)
    if (h6Match) return { title: h6Match[1].trim(), level: 6 }
    
    // 尝试从title标签中提取
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) return { title: titleMatch[1].trim(), level: 1 }
    
    // 尝试从包含"chapter"、"章"、"节"等关键词的标签中提取
    const chapterMatch = html.match(/<[^>]*>(.*?(?:chapter|章|节)[^<]*)<\/[^>]*>/i)
    if (chapterMatch) return { title: chapterMatch[1].trim(), level: 2 }
    
    // 提取前100个字符作为标题
    const textContent = extractTextFromHtml(html)
    const firstLine = textContent.split('\n')[0].trim()
    if (firstLine.length > 0 && firstLine.length < 50) {
      return { title: firstLine, level: 3 }
    }
    
    return { title: '', level: 0 }
  } catch (error) {
    console.warn('章节信息提取失败:', error)
    return { title: '', level: 0 }
  }
}

/**
 * 检查文件是否为EPUB格式
 * @param {string} fileName 文件名
 * @returns {boolean} 是否为EPUB文件
 */
function isEpubFile(fileName) {
  return fileName.toLowerCase().endsWith('.epub')
}

/**
 * 从EPUB文件中提取封面图片（如果有）
 * @param {string} filePath EPUB文件路径
 * @returns {Promise<string|null>} 封面图片的base64数据或null
 */
async function extractEpubCover(filePath) {
  try {
    const epubData = fs.readFileSync(filePath)
    const zip = await JSZip.loadAsync(epubData)
    
    // 查找封面图片
    let coverFile = null
    zip.forEach((relativePath, file) => {
      if (relativePath.includes('cover') && 
          (relativePath.endsWith('.jpg') || relativePath.endsWith('.jpeg') || relativePath.endsWith('.png'))) {
        coverFile = file
      }
    })
    
    if (coverFile) {
      const coverData = await coverFile.async('base64')
      const ext = path.extname(coverFile.name).toLowerCase()
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg'
      return `data:${mimeType};base64,${coverData}`
    }
    
    return null
    
  } catch (error) {
    console.warn('封面提取失败:', error.message)
    return null
  }
}

export {
  parseEpub,
  isEpubFile,
  extractEpubCover
}
