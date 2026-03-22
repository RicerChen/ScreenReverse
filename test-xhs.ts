
const { playwrightCapture } = require("./src/lib/playwright/capture");
const path = require("path");
const fs = require("fs");

/**
 * 简单的测试脚本，用于验证小红书内容的提取情况
 */
async function testCapture() {
  // 测试链接（可以替换为你手里的小红书链接）
  const testUrl = "http://xhslink.com/o/4dwUEynFnZC ";
  const taskId = "test-xhs-" + Date.now();

  console.log(`🚀 开始测试小红书抓取: ${testUrl}`);
  
  try {
    await playwrightCapture.init();
    const result = await playwrightCapture.extractPageContent(testUrl, taskId, true);

    console.log("\n✅ 抓取成功！");
    console.log("-----------------------------------");
    console.log(`标题: ${result.title}`);
    console.log(`文本长度: ${result.text.length} 字符`);
    console.log(`截图路径: ${result.screenshotPath}`);
    console.log("-----------------------------------");
    console.log("提取的内容预览 (前 200 字):");
    console.log(result.text.substring(0, 200) + "...");
    console.log("-----------------------------------");

    // 检查截图是否存在
    if (result.screenshotPath && fs.existsSync(result.screenshotPath)) {
      console.log(`📸 截图已保存，你可以去查看: ${result.screenshotPath}`);
    }

  } catch (error) {
    console.error("❌ 测试失败:", error);
  } finally {
    await playwrightCapture.close();
    process.exit(0);
  }
}

testCapture();
