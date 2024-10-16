document.addEventListener('DOMContentLoaded', function () {
    const tabList = document.getElementById('tabList');
    const categorySelect = document.getElementById('category');
    const assignCategoryBtn = document.getElementById('assignCategory');
    const clearTabsBtn = document.getElementById('clearTabs');
    const showTrackedTabsBtn = document.getElementById('showTrackedTabs');
    const trackedTabsContainer = document.getElementById('trackedTabsContainer');
    const trackedTabList = document.getElementById('trackedTabList');
    const closeTrackedTabsBtn = document.getElementById('closeTrackedTabs');
    let currentTabId;

    // Open tracked tabs by default
    trackedTabsContainer.style.display = 'block';

    // Get the currently active tab
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs || tabs.length === 0) {
            console.error('No active tab found.');
            return;
        }

        currentTabId = tabs[0].id;
        let tabTitle = tabs[0].title;

        // Check if the tab already exists in the list
        let existingTab = document.querySelector(`[data-tab-id="${currentTabId}"]`);
        if (!existingTab) {
            let tabItem = document.createElement('li');
            tabItem.setAttribute('data-tab-id', currentTabId);
            tabItem.textContent = tabTitle + ' - (Not Categorized)';
            tabList.appendChild(tabItem);
        }

        // Load tracked tabs on startup
        loadTrackedTabs();
    });

    // Assign selected category to the current tab
    assignCategoryBtn.addEventListener('click', function () {
        const category = categorySelect.value;
        const timestamp = new Date().getTime();
        const tabData = { category, timestamp };

        chrome.storage.local.set({ [currentTabId]: tabData }, function () {
            console.log('Tab assigned to category: ', category);
            updateTabList(currentTabId, category, timestamp);
            addTabToTrackedList(currentTabId, category, timestamp);
        });
    });

    // Clear expired tabs based on time sensitivity
    clearTabsBtn.addEventListener('click', function () {
        chrome.storage.local.get(null, function (items) {
            const currentTime = new Date().getTime();
            for (let [tabId, tabData] of Object.entries(items)) {
                const tabAge = currentTime - tabData.timestamp;
                let timeLimit = getTimeLimit(tabData.category);

                if (tabAge > timeLimit) {
                    chrome.tabs.remove(parseInt(tabId), function () {
                        console.log('Closed expired tab: ', tabId);
                        chrome.storage.local.remove(tabId.toString(), function() {
                            console.log('Removed tab data for:', tabId);
                        });
                    });
                }
            }
        });
    });

    // Show tracked tabs
    showTrackedTabsBtn.addEventListener('click', function () {
        trackedTabsContainer.style.display = 'block';
    });

    // Close tracked tabs
    closeTrackedTabsBtn.addEventListener('click', function () {
        trackedTabsContainer.style.display = 'none';
    });

    // Load tracked tabs from storage and display them
    function loadTrackedTabs() {
        chrome.storage.local.get(null, function (items) {
            for (let [tabId, tabData] of Object.entries(items)) {
                addTabToTrackedList(tabId, tabData.category, tabData.timestamp);
            }
        });
    }

    // Update tab list in popup
    function updateTabList(tabId, category, timestamp) {
        let listItem = document.querySelector(`[data-tab-id="${tabId}"]`);

        if (!listItem) {
            let tabTitle = `Tab ${tabId}`;
            listItem = document.createElement('li');
            listItem.setAttribute('data-tab-id', tabId);
            tabList.appendChild(listItem);
        }

        const timeRemaining = getTimeLimit(category) - (new Date().getTime() - timestamp);
        const formattedTime = formatTime(timeRemaining);
        listItem.textContent = `Tab ${tabId} - ${category} (Expires in: ${formattedTime})`;
    }

    // Add tab to tracked tabs list
    function addTabToTrackedList(tabId, category, timestamp) {
        let trackedTabItem = document.querySelector(`[data-tracked-tab-id="${tabId}"]`);

        if (!trackedTabItem) {
            trackedTabItem = document.createElement('li');
            trackedTabItem.setAttribute('data-tracked-tab-id', tabId);
            trackedTabItem.textContent = `Tab ${tabId} - ${category} (Added: ${new Date(timestamp).toLocaleString()})`;

            let removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', function () {
                trackedTabItem.remove();
                // Remove tab data from storage
                chrome.storage.local.remove(tabId.toString(), function() {
                    console.log('Removed tracked tab data for:', tabId);
                });
                // Optionally close the tab
                chrome.tabs.remove(parseInt(tabId), function() {
                    console.log('Closed tab:', tabId);
                });
            });

            trackedTabItem.appendChild(removeButton);
            trackedTabList.appendChild(trackedTabItem);
        }
    }

    // Formatting and helper functions
    function formatTime(milliseconds) {
        let hours = Math.floor(milliseconds / (1000 * 60 * 60));
        let minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    function getTimeLimit(category) {
        switch (category) {
            case 'urgent':
                return 1 * 60 * 60 * 1000; // 1 hour in milliseconds
            case 'dueTomorrow':
                return 24 * 60 * 60 * 1000; // 24 hours
            case 'upcomingWeek':
                return 7 * 24 * 60 * 60 * 1000; // 1 week
            case 'forLater':
                return 30 * 24 * 60 * 60 * 1000; // 1 month
            default:
                return 0;
        }
    }
});
