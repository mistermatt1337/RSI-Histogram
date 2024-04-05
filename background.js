let contentScriptExecuted = false;

chrome.runtime.onMessage.addListener(function(request, sender) {
    if (request.action === 'executeContentScript') {
        if (request.tabId) {
            console.log('Executing content script in tab:', request.tabId);
            chrome.scripting.executeScript({
                target: {tabId: request.tabId},
                files: ['content.js']
            }, function() {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                } else {
                    console.log('Content script execution started');
                    contentScriptExecuted = true;
                }
            });
        } else {
            console.log('No tabId provided');
        }
    }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'dataExtractionCompleted' && contentScriptExecuted) {
        console.log('Data extraction completed');
        // Send message to popup.js
        chrome.runtime.sendMessage({action: 'dataExtractionCompleted'});
        sendResponse({message: 'Data extraction completed message forwarded'});
        contentScriptExecuted = false; // Reset the flag
    }
    // Indicate that the response will be sent asynchronously
    return true;
});