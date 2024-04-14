// popup.js is a JavaScript file that runs in the popup of your Chrome extension.
// Listen for the parse button click
document.getElementById('parse').addEventListener('click', function() {
    chrome.runtime.sendMessage({action: 'executeContentScript'}, function(response) {
        if (response && response.error) {
            alert('Error: ' + response.error + '. Please refresh the page and try again.');
        }
    });
});
// Listen for the options button click
document.getElementById('optionsButton').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
});

// Request the tabId from background.js
let tabId;
chrome.runtime.sendMessage({action: 'getTabId'}, function(response) {
    tabId = response;
});

// listen for the any updateStatus message from content.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateStatus') {
        document.getElementById('status').textContent = request.status;
    }
});

// Listen for dataExtractionCompleted message from the background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'dataExtractionCompleted') {
        document.getElementById('status').textContent = 'Data extraction completed.';
        
        // Get the current tab ID
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            // Send the createModal message to the content script
            chrome.tabs.sendMessage(tabs[0].id, {action: 'createModal', ordersDataSet: request.ordersDataSet});
        });
    }
});
// Listen for resetButton click
document.getElementById('resetButton').addEventListener('click', function() {
    chrome.runtime.sendMessage({action: 'resetData'});
    document.getElementById('status').textContent = 'Data reset started';
});