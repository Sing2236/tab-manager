chrome.tabs.onRemoved.addListener(function (tabId) {
    chrome.storage.local.remove(tabId.toString(), function () {
        console.log('Tab data removed for closed tab: ', tabId);
    });
});
