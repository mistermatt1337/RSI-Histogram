// background.js is a special JavaScript file that runs in the background of your Chrome extension.
let targetTabId;
// Ensure we have the tab ID
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'getTabId' && sender.tab) {
        if (sender.tab) {
            sendResponse(sender.tab.id);
        } else {
            chrome.runtime.sendMessage({action: 'updateStatus', status: 'Cannot get tab ID: sender.tab is undefined'});        }
    }
});

let contentScriptExecuted = false;
// Listen for message from the popup.js script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'executeContentScript') {
        if (contentScriptExecuted) {
            sendResponse({error: 'Content script is already running'});
            return;
        }
        chrome.tabs.query({url: 'https://robertsspaceindustries.com/account/billing'}, function(tabs) {
            if (tabs.length === 0) {
                sendResponse({error: 'Please navigate to the Billing page and try again.'});
                return;
            }

            var targetTab = tabs[0];
            targetTabId = targetTab.id;

            chrome.scripting.executeScript({
                target: {tabId: targetTab.id},
                files: ['scripts/content.js']
            }, function() {
                if (chrome.runtime.lastError) {
                    chrome.runtime.sendMessage({action: 'updateStatus', status: chrome.runtime.lastError.message});
                    sendResponse({error: chrome.runtime.lastError.message});
                } else {
                    contentScriptExecuted = true;
                    chrome.runtime.sendMessage({action: 'updateStatus', status: 'Content script execution started'});
                    sendResponse({message: 'Content script execution started'});
                }
            });
        });
        return true; // Keeps the message channel open until sendResponse is called
    }
});
// Listen for message from the content.js script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'dataExtractionCompleted' && contentScriptExecuted) {
        contentScriptExecuted = false; // Reset the flag
    }
    return true; // Keeps the message channel open until sendResponse is called
});

// keep track of the tabs where the scripts have been injected
let injectedTabs = new Set();
// listen for the injectChartjs action
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'injectChartjs') {
        if (injectedTabs.has(sender.tab.id)) {
            sendResponse({success: true, message: 'Scripts already injected'});
            return;
        }

        chrome.scripting.executeScript({
            target: {tabId: sender.tab.id},
            files: ['scripts/chart.umd.min.js', 'scripts/chartjs-adapter-date-fns.bundle.min.js', 'scripts/chartjs-adapter-moment.min.js']
        }, () => {
            if (chrome.runtime.lastError) {
                sendResponse({success: false});
            } else {
                injectedTabs.add(sender.tab.id);
                sendResponse({success: true});
            }
        });

        return true;  // Will respond asynchronously.
    }
});
// remove the tab from the injectedTabs set when it is reloaded or closed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') {
        injectedTabs.delete(tabId);
    }
});
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    injectedTabs.delete(tabId);
});

// listen for the resetData action
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'resetData') {
        // Clear the ordersDataSet from local storage
        chrome.storage.local.remove('ordersDataSet', function() {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }
            // Send a message to the status 
            chrome.runtime.sendMessage({action: 'updateStatus', status: 'Data reset completed'});
            // Reset the contentScriptExecuted flag
            contentScriptExecuted = false;
            // Refresh the page
            chrome.tabs.reload(targetTabId);
        });
    }

    // Handle other actions...
});