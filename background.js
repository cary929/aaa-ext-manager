// 后台脚本逻辑
chrome.runtime.onInstalled.addListener(function() {
  console.log("Extension installed");
  // 初始化存储
  chrome.storage.local.get('groups', function(data) {
    if (!data.groups) {
      chrome.storage.local.set({groups: []}, function() {
        console.log('Initialized empty groups array');
      });
    }
  });
});

// 可以在这里添加其他后台任务或事件监听器
