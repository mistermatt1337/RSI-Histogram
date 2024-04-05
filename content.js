let ordersDataSet = [];

// Start extracting data from the first page
extractDataFromPage(1).then(() => {
    // After all the data has been extracted, save it to local storage
    chrome.storage.local.set({ordersDataSet: ordersDataSet}, function() {
        console.log('Orders data saved to local storage.');

        chrome.storage.local.get(['ordersData', 'ordersDataSet'], function(result) {
            if (result.ordersData && Array.isArray(result.ordersData)) {
                console.log('ordersData exists in local storage');
            } else {
                console.log('ordersData does not exist in local storage');
            }

            if (result.ordersDataSet && Array.isArray(result.ordersDataSet)) {
                console.log('ordersDataSet exists in local storage');
            } else {
                console.log('ordersDataSet does not exist in local storage');
            }
        });
    });

    // Send a message to the background script to indicate that the action is completed
    chrome.runtime.sendMessage({action: 'dataExtractionCompleted'});
});
// Content script to extract data from the billing page

// Function to extract data from a page
async function extractDataFromPage(pageNumber) {
    // Make a request to the page
    let response = await fetch(`https://robertsspaceindustries.com/account/billing?page=${pageNumber}&pagesize=100`);
    let text = await response.text();

    // Parse the HTML of the page
    let parser = new DOMParser();
    let doc = parser.parseFromString(text, 'text/html');

    // Extract the data from the page
    // Select all list item elements within unordered list elements with the class "orders-item"
    let ordersItems = document.querySelectorAll('ul.orders-item li');

    // Initialize an array to hold the extracted data
    let ordersData = [];

    // Regular expressions for the three criteria
    //let orderPlacedRegex = /Order Placed:\s*([A-Za-z]+ \d{2}, \d{4} \d{2}:\d{2})/;
    let orderPlacedRegex = /Order Placed:\s*([^]*?)\n/;
    let amountRegex = /Amount:\s*\$(\d+(\.\d{2})?)/;
    let orderIdRegex = /Order Id:\s*(\w+)/;

    // Loop through the selected elements
    ordersItems.forEach((item) => {
        // Extract the text content of the element
        let text = item.textContent.trim();
        // Try to match the three criteria
        let orderPlacedMatch = text.match(orderPlacedRegex);
        let amountMatch = text.match(amountRegex);
        let orderIdMatch = text.match(orderIdRegex);
        // Initialize a running total
        let runningTotal = 0;
        // If all three criteria were matched, add the data to the array
        if (orderPlacedMatch && amountMatch && orderIdMatch) {
            // Convert the date and amount to their appropriate types
            let orderPlaced = new Date(orderPlacedMatch[1]);
            let amount = parseFloat(amountMatch[1]);
            // Update the running total
            runningTotal += amount;
            // Add the data to the array
            ordersData.push({
                orderPlaced: orderPlaced,
                amount: amount,
                orderId: orderIdMatch[1],
                runningTotal: runningTotal
            });
        }
    }); // End of forEach
    // Add the extracted data to the global array
    ordersDataSet.push(ordersData);
    // Check if there is a next page
    let nextPageLink = doc.querySelector('a[href^="https://robertsspaceindustries.com/account/billing?page="]');
    if (nextPageLink) {
        // Extract the page number from the next page link
        let nextPageNumber = nextPageLink.href.match(/page=(\d+)/)[1];
        // Recursively call this function to extract data from the next page
        await extractDataFromPage(nextPageNumber);
    }
}
