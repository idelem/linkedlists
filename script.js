// Main data structure for the application
let data = {
    lists: [],
    archive: [],
    trash: [],
    currentView: 'main'
};

// DOM elements
const listsContainer = document.getElementById('lists-container');
const addListButton = document.getElementById('add-list-button');
const trashButton = document.getElementById('trash-button');
const archiveButton = document.getElementById('archive-button');
const archiveView = document.getElementById('archive-view');
const trashView = document.getElementById('trash-view');
const archiveBack = document.getElementById('archive-back');
const trashBack = document.getElementById('trash-back');
const archivedListsContainer = document.getElementById('archived-lists-container');
const trashList = document.getElementById('trash-list');
const searchBar = document.getElementById('search-bar');

// Initialize the application
function init() {
    loadData();
    renderLists();
    setupEventListeners();
    setupSearchFunctionality();
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('linkManagerData', JSON.stringify(data));
}

// Load data from localStorage
function loadData() {
    const savedData = localStorage.getItem('linkManagerData');
    if (savedData) {
        data = JSON.parse(savedData);
    } else {
        // Initialize with a default inbox list
        data.lists.push({
            id: generateId(),
            name: 'Inbox',
            items: [],
            collapsed: false
        });
    }
}

// Generate a unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Set up event listeners
function setupEventListeners() {
    addListButton.addEventListener('click', createNewList); 
    trashButton.addEventListener('click', showTrashView);
    archiveButton.addEventListener('click', showArchiveView);
    archiveBack.addEventListener('click', showMainView);
    trashBack.addEventListener('click', showMainView);
}

function setupSearchFunctionality() {
    searchBar.addEventListener('input', performSearch);
    // searchBar.addEventListener('focusout', exitSearchMode);
    searchBar.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            exitSearchMode();
        }
    });

    // Add keyboard shortcut (Ctrl+/)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            searchBar.focus();
        }
    });
}

// Create a new list
function createNewList() {
    const newList = {
        id: generateId(),
        name: 'New List',
        items: [],
        collapsed: false
    };
    
    data.lists.push(newList);
    renderList(newList);
    saveData();
    
    // Focus on the new list title for editing
    setTimeout(() => {
        const listTitle = document.querySelector(`.list[data-id="${newList.id}"] .list-title`);
        if (listTitle) {
            listTitle.focus();
            selectElementContents(listTitle);
        }
    }, 0);
}

// Render all lists
function renderLists() {
    listsContainer.innerHTML = '';
    data.lists.forEach(list => renderList(list));
}

// Render a single list
function renderList(list) {
    const listElement = document.createElement('div');
    listElement.className = `list ${list.collapsed ? 'list-collapsed' : ''}`;
    listElement.dataset.id = list.id;
    
    const listHeader = document.createElement('div');
    listHeader.className = 'list-header';
    
    const listTitle = document.createElement('div');
    listTitle.className = 'list-title';
    listTitle.textContent = list.name;
    listTitle.contentEditable = true;
    listTitle.addEventListener('blur', (e) => {
        const newName = e.target.textContent.trim();
        if (newName) {
            list.name = newName;
            saveData();
        } else {
            e.target.textContent = list.name;
        }
    });
    listTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        }
    });
    
    const listActions = document.createElement('div');
    listActions.className = 'list-actions';
    
    const toggleButton = document.createElement('button');
    toggleButton.className = 'list-button toggle-button';
    toggleButton.innerHTML = list.collapsed ? '<i class="fas fa-expand"></i>' : '<i class="fas fa-compress"></i>';
    toggleButton.title = list.collapsed ? 'Expand' : 'Collapse';
    toggleButton.addEventListener('click', () => toggleList(list.id));
    
    const archiveButton = document.createElement('button');
    archiveButton.className = 'list-button archive-button';
    archiveButton.innerHTML = '<i class="fas fa-archive"></i>';
    archiveButton.title = 'Archive List';
    archiveButton.addEventListener('click', () => archiveList(list.id));
    
    listActions.appendChild(toggleButton);
    listActions.appendChild(archiveButton);
    
    listHeader.appendChild(listTitle);
    listHeader.appendChild(listActions);
    
    const listItems = document.createElement('div');
    listItems.className = 'list-items';
    
    list.items.forEach(item => {
        const itemElement = createItemElement(item, list.id);
        listItems.appendChild(itemElement);
    });
    
    // Add paste event listener to capture URLs
    listElement.addEventListener('paste', (e) => {
            console.log('Processing paste');
        // if (e.target.classList.contains('list-items') || e.target.closest('.list-items') === listItems) {
            const clipboardData = e.clipboardData || window.clipboardData;
            const pastedText = clipboardData.getData('text');
            console.log('Processing paste:', pastedText);
            
            // Check if it's a Markdown link
            const markdownLink = parseMarkdownLink(pastedText);
            
            if (markdownLink) {
                e.preventDefault();
                console.log('Detected Markdown link:', markdownLink);
                addLinkToList(list.id, markdownLink.url, markdownLink.title);
            } else if (isValidURL(pastedText)) {
                e.preventDefault();
                console.log('Detected URL:', pastedText);
                addLinkToList(list.id, pastedText);
            } else {
                console.log('Not recognized as URL or Markdown link');
            }
        // }
    });
    
    // Make items sortable within and between lists
    setupDragAndDrop(listElement, list.id);
    
    listElement.appendChild(listHeader);
    listElement.appendChild(listItems);
    
    listsContainer.appendChild(listElement);
}

// Create a list item element
function createItemElement(item, listId) {
    const itemElement = document.createElement('div');
    itemElement.className = 'list-item draggable';
    itemElement.dataset.id = item.id;
    itemElement.draggable = true;
    
    // In the createItemElement function, modify the linkTitle section:

    const linkTitle = document.createElement('div');
    linkTitle.className = 'link-title';

    const linkAnchor = document.createElement('a');
    linkAnchor.href = item.url;
    linkAnchor.textContent = item.title;
    linkAnchor.target = '_blank';
    linkAnchor.rel = 'noopener noreferrer';

    const titleEditor = document.createElement('div');
    titleEditor.className = 'title-editor';
    titleEditor.contentEditable = true;
    titleEditor.textContent = item.title;
    titleEditor.style.display = 'none'; // Hide initially

    // Add click handler to prevent opening URL when in edit mode
    linkAnchor.addEventListener('click', (e) => {
        if (itemElement.classList.contains('edit-mode')) {
            e.preventDefault();
            linkAnchor.contentEditable = true;
            linkAnchor.focus();
            selectElementContents(linkAnchor);
        }
    });

    // Save title when done editing
    titleEditor.addEventListener('blur', (e) => {
        const newTitle = e.target.textContent.trim();
        if (newTitle) {
            item.title = newTitle;
            linkAnchor.textContent = newTitle;
            saveData();
        } else {
            e.target.textContent = item.title;
        }
        
        // Check if we should exit edit mode
        setTimeout(() => {
            if (document.activeElement !== linkUrl && 
                document.activeElement !== linkDescription) {
                exitEditMode();
            }
        }, 0);
    });

    titleEditor.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        }
    });

    
    linkTitle.appendChild(linkAnchor);
    linkTitle.appendChild(titleEditor);

    // Function to enter edit mode
    function enterEditMode() {
        itemElement.classList.add('edit-mode');
        linkAnchor.style.display = 'none';
        titleEditor.style.display = 'block';
        itemElement.draggable = false;
        e.stopPropagation();
    }

    // Function to exit edit mode
    function exitEditMode() {
        itemElement.classList.remove('edit-mode');
        linkAnchor.style.display = 'block';
        titleEditor.style.display = 'none';
        itemElement.draggable = true;
    }
    
    const linkUrl = document.createElement('div');
    linkUrl.className = 'link-url';
    linkUrl.contentEditable = true;
    linkUrl.textContent = item.url;
    linkUrl.addEventListener('blur', (e) => {
        const newUrl = e.target.textContent.trim();
        if (isValidURL(newUrl)) {
            item.url = newUrl;
            linkAnchor.href = newUrl;
            saveData();
        } else {
            e.target.textContent = item.url;
        }
        
        setTimeout(() => {
            if (document.activeElement !== titleEditor && 
                document.activeElement !== linkDescription) {
                itemElement.classList.remove('edit-mode');
            }
        }, 0);
    });

    linkUrl.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    linkUrl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        }
    });
    
    const linkDescription = document.createElement('div');
    linkDescription.className = 'link-description';
    linkDescription.innerHTML = (item.description && item.description !== 'Add a description...')
        ? item.description
            .replace(/\n\n/g, '<br>&nbsp;<br>') // handle double line breaks first
            .replace(/\n/g, '<br>')             // then single line breaks
        : 'Add a description...';
    linkDescription.contentEditable = true;
    linkDescription.addEventListener('click', () => {
        if (linkDescription.textContent === 'Add a description...') {
            linkDescription.textContent = '';
        }
        
        // Show URL field when editing description
        // itemElement.classList.add('edit-mode');
        enterEditMode();
    });

    linkDescription.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    linkDescription.addEventListener('blur', (e) => {
        // Replace <div> and <br> with \n, then strip HTML tags
        let html = e.target.innerHTML;
        html = html.replace(/<div><br><\/div>/g, '\n')
                .replace(/<div>/g, '\n')
                .replace(/<br>/g, '\n')
                .replace(/<\/div>/g, '');
        const newDescription = html.trim();
        if (newDescription && newDescription !== 'Add a description...') {
            item.description = newDescription;
        } else {
            item.description = '';
            e.target.textContent = 'Add a description...';
        }
        saveData();

        setTimeout(() => {
            if (document.activeElement !== linkUrl && 
                document.activeElement !== titleEditor) {
                exitEditMode();
            }
        }, 0);
    });
    
    const deleteButton = document.createElement('button');
    let deleteMode = false;
    deleteButton.className = 'delete-button';
    deleteButton.innerHTML = '<i class="fas fa-times"></i>';
    deleteButton.addEventListener('click', () => {
        if (!deleteMode) {
            deleteMode = true;
            itemElement.classList.add('delete-mode');
        }
        else {
            deleteItem(item.id, listId);
        }
    });
    deleteButton.addEventListener('blur', () => {
        deleteMode = false;
        itemElement.classList.remove('delete-mode');
    });
    
    itemElement.appendChild(linkTitle);
    itemElement.appendChild(linkUrl);
    itemElement.appendChild(linkDescription);
    itemElement.appendChild(deleteButton);
    
    // Setup drag events
    itemElement.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            itemId: item.id,
            listId: listId
        }));
        itemElement.classList.add('dragging');
    });
    
    itemElement.addEventListener('dragend', () => {
        itemElement.classList.remove('dragging');
    });
    
    return itemElement;
}

// Toggle list collapse state
function toggleList(listId) {
    const listIndex = data.lists.findIndex(list => list.id === listId);
    if (listIndex !== -1) {
        data.lists[listIndex].collapsed = !data.lists[listIndex].collapsed;
        saveData();
        renderLists();
    }
}

// Archive a list
function archiveList(listId) {
    const listIndex = data.lists.findIndex(list => list.id === listId);
    if (listIndex !== -1) {
        const list = data.lists.splice(listIndex, 1)[0];
        data.archive.push(list);
        saveData();
        renderLists();
    }
}

// Check if a string is a valid URL
function isValidURL(string) {
    // Simple check if string starts with http:// or https://
    if (string.startsWith('http://') || string.startsWith('https://')) {
        return true;
    }
    
    // More comprehensive validation using URL constructor
    try {
        new URL(string);
        return true;
    } catch (_) {
        // Try with added https://
        try {
            new URL('https://' + string);
            return true;
        } catch (_) {
            return false;
        }
    }
}

// Add a link to a list
// Add a link to a list
function addLinkToList(listId, url, title = null) {
    const listIndex = data.lists.findIndex(list => list.id === listId);
    if (listIndex !== -1) {
        if (title) {
            // If title is provided, use it directly
            const newItem = {
                id: generateId(),
                url: url,
                title: title,
                description: '',
                dateAdded: new Date().toISOString()
            };
            
            data.lists[listIndex].items.push(newItem);
            saveData();
            
            // Rerender just this list
            const listElement = document.querySelector(`.list[data-id="${listId}"]`);
            if (listElement) {
                const listItems = listElement.querySelector('.list-items');
                const itemElement = createItemElement(newItem, listId);
                listItems.appendChild(itemElement);
            }
        } else {
            // For plain URLs, fetch title as before
            fetchPageTitle(url)
                .then(fetchedTitle => {
                    const newItem = {
                        id: generateId(),
                        url: url,
                        title: fetchedTitle || url,
                        description: '',
                        dateAdded: new Date().toISOString()
                    };
                    
                    data.lists[listIndex].items.push(newItem);
                    saveData();
                    
                    // Rerender just this list
                    const listElement = document.querySelector(`.list[data-id="${listId}"]`);
                    if (listElement) {
                        const listItems = listElement.querySelector('.list-items');
                        const itemElement = createItemElement(newItem, listId);
                        listItems.appendChild(itemElement);
                    }
                });
        }
    }
}

// Fetch page title from URL
async function fetchPageTitle(url) {
    try {
        // In a real application, you would use a server-side proxy to fetch the title
        // For demo purposes, we'll use a mock function that returns a title based on the domain
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        
        return domain.replace('www.', '') + ' - Page Title';
    } catch (error) {
        console.error('Error fetching page title:', error);
        return url;
    }
}

// Delete an item and move it to trash
function deleteItem(itemId, listId) {
    const listIndex = data.lists.findIndex(list => list.id === listId);
    if (listIndex !== -1) {
        const itemIndex = data.lists[listIndex].items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            const item = data.lists[listIndex].items.splice(itemIndex, 1)[0];
            item.originalListId = listId;
            item.originalListName = data.lists[listIndex].name;
            item.deletedDate = new Date().toISOString();
            
            data.trash.push(item);
            saveData();
            
            // Remove the item from the DOM
            const itemElement = document.querySelector(`.list-item[data-id="${itemId}"]`);
            if (itemElement) {
                itemElement.remove();
            }
        }
    }
}

// Show trash view
function showTrashView() {
    data.currentView = 'trash';
    document.querySelector('main').classList.add('hidden');
    trashView.classList.remove('hidden');
    archiveView.classList.add('hidden');
    
    renderTrashItems();
}

// Show archive view
function showArchiveView() {
    data.currentView = 'archive';
    document.querySelector('main').classList.add('hidden');
    archiveView.classList.remove('hidden');
    trashView.classList.add('hidden');
    
    renderArchivedLists();
}

// Show main view
function showMainView() {
    data.currentView = 'main';
    document.querySelector('main').classList.remove('hidden');
    archiveView.classList.add('hidden');
    trashView.classList.add('hidden');
}

// Render trash items
function renderTrashItems() {
    trashList.innerHTML = '';
    
    if (data.trash.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'No items in trash.';
        trashList.appendChild(emptyMessage);
        return;
    }
    
    data.trash.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'trash-item';
        
        const itemTitle = document.createElement('div');
        itemTitle.className = 'link-title';
        
        const linkAnchor = document.createElement('a');
        linkAnchor.href = item.url;
        linkAnchor.textContent = item.title;
        linkAnchor.target = '_blank';
        
        itemTitle.appendChild(linkAnchor);
        
        const itemDescription = document.createElement('div');
        itemDescription.className = 'link-description';
        itemDescription.textContent = item.description || 'No description';
        
        const listOrigin = document.createElement('div');
        listOrigin.className = 'list-origin';
        listOrigin.textContent = `From: ${item.originalListName}`;
        
        const itemDate = document.createElement('div');
        itemDate.className = 'list-origin';
        itemDate.textContent = `Deleted: ${new Date(item.deletedDate).toLocaleString()}`;
        
        const trashActions = document.createElement('div');
        trashActions.className = 'trash-actions';
        
        const restoreButton = document.createElement('button');
        restoreButton.className = 'trash-button restore';
        restoreButton.textContent = 'Restore';
        restoreButton.addEventListener('click', () => restoreItem(item.id));
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'trash-button';
        deleteButton.textContent = 'Delete Permanently';
        deleteButton.addEventListener('click', () => confirmPermanentDelete(item.id));
        
        trashActions.appendChild(restoreButton);
        trashActions.appendChild(deleteButton);
        
        itemElement.appendChild(itemTitle);
        itemElement.appendChild(itemDescription);
        itemElement.appendChild(listOrigin);
        itemElement.appendChild(itemDate);
        itemElement.appendChild(trashActions);
        
        trashList.appendChild(itemElement);
    });
}

// Render archived lists
function renderArchivedLists() {
    archivedListsContainer.innerHTML = '';
    
    if (data.archive.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'No archived lists.';
        archivedListsContainer.appendChild(emptyMessage);
        return;
    }
    
    data.archive.forEach(list => {
        const listElement = document.createElement('div');
        listElement.className = 'list';
        listElement.dataset.id = list.id;
        
        const listHeader = document.createElement('div');
        listHeader.className = 'list-header';
        
        const listTitle = document.createElement('div');
        listTitle.className = 'list-title';
        listTitle.textContent = list.name;
        
        const listActions = document.createElement('div');
        listActions.className = 'list-actions';
        
        const restoreButton = document.createElement('button');
        restoreButton.className = 'list-button';
        restoreButton.innerHTML = '<i class="fas fa-undo"></i>';
        restoreButton.title = 'Restore List';
        restoreButton.addEventListener('click', () => restoreList(list.id));
        
        listActions.appendChild(restoreButton);
        
        listHeader.appendChild(listTitle);
        listHeader.appendChild(listActions);
        
        const listItems = document.createElement('div');
        listItems.className = 'list-items';
        
        list.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'list-item';
            
            const linkTitle = document.createElement('div');
            linkTitle.className = 'link-title';
            
            const linkAnchor = document.createElement('a');
            linkAnchor.href = item.url;
            linkAnchor.textContent = item.title;
            linkAnchor.target = '_blank';
            
            linkTitle.appendChild(linkAnchor);
            
            const linkDescription = document.createElement('div');
            linkDescription.className = 'link-description';
            linkDescription.textContent = item.description || 'No description';
            
            itemElement.appendChild(linkTitle);
            itemElement.appendChild(linkDescription);
            
            listItems.appendChild(itemElement);
        });
        
        listElement.appendChild(listHeader);
        listElement.appendChild(listItems);
        
        archivedListsContainer.appendChild(listElement);
    });
}

// Restore a list from archive
function restoreList(listId) {
    const listIndex = data.archive.findIndex(list => list.id === listId);
    if (listIndex !== -1) {
        const list = data.archive.splice(listIndex, 1)[0];
        data.lists.push(list);
        saveData();
        renderArchivedLists();
    }
}

// Restore an item from trash
function restoreItem(itemId) {
    const itemIndex = data.trash.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
        const item = data.trash.splice(itemIndex, 1)[0];
        
        // Find original list
        let targetListId = item.originalListId;
        let targetListIndex = data.lists.findIndex(list => list.id === targetListId);
        
        // If original list doesn't exist anymore, use inbox
        if (targetListIndex === -1) {
            targetListIndex = data.lists.findIndex(list => list.name === 'Inbox');
            if (targetListIndex === -1 && data.lists.length > 0) {
                targetListIndex = 0;
            }
        }
        
        if (targetListIndex !== -1) {
            // Remove properties added for trash
            delete item.originalListId;
            delete item.originalListName;
            delete item.deletedDate;
            
            data.lists[targetListIndex].items.push(item);
            saveData();
            renderTrashItems();
        }
    }
}

// Confirm permanent delete
function confirmPermanentDelete(itemId) {
    modalTitle.textContent = 'Permanently Delete';
    modalMessage.textContent = 'This item will be permanently deleted and cannot be recovered. Continue?';
    
    modalConfirm.onclick = () => {
        permanentlyDeleteItem(itemId);
        modal.style.display = 'none';
    };
    
    modal.style.display = 'flex';
}

// Permanently delete item
function permanentlyDeleteItem(itemId) {
    const itemIndex = data.trash.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
        data.trash.splice(itemIndex, 1);
        saveData();
        renderTrashItems();
    }
}

// Select all text in an element for easy editing
function selectElementContents(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

// Set up drag and drop functionality
function setupDragAndDrop(container, listId) {
    // Add event listeners for the container (dropzone)
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggable = document.querySelector('.dragging');
        if (draggable) {
            const afterElement = getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                container.appendChild(draggable);
            } else {
                container.insertBefore(draggable, afterElement);
            }
        }
    });
    
    container.addEventListener('drop', (e) => {
        e.preventDefault();
        const draggableData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const sourceListId = draggableData.listId;
        const itemId = draggableData.itemId;
        
        // If the item was dropped in a different list
        if (sourceListId !== listId) {
            moveItemBetweenLists(itemId, sourceListId, listId);
        } else {
            // Reorder items within the same list
            updateItemOrder(listId);
        }
        e.classList.remove('edit-mode');
    });
}

// Move an item between lists
function moveItemBetweenLists(itemId, sourceListId, targetListId) {
    const sourceListIndex = data.lists.findIndex(list => list.id === sourceListId);
    const targetListIndex = data.lists.findIndex(list => list.id === targetListId);
    
    if (sourceListIndex !== -1 && targetListIndex !== -1) {
        const itemIndex = data.lists[sourceListIndex].items.findIndex(item => item.id === itemId);
        
        if (itemIndex !== -1) {
            const item = data.lists[sourceListIndex].items.splice(itemIndex, 1)[0];
            data.lists[targetListIndex].items.push(item);
            
            // Update order based on DOM
            updateItemOrder(targetListId);
            saveData();
        }
    }
}

// Update item order based on DOM
function updateItemOrder(listId) {
    const listIndex = data.lists.findIndex(list => list.id === listId);
    if (listIndex !== -1) {
        const listElement = document.querySelector(`.list[data-id="${listId}"]`);
        if (listElement) {
            const listItems = listElement.querySelectorAll('.list-item');
            const newItemsOrder = [];
            
            listItems.forEach(itemElement => {
                const itemId = itemElement.dataset.id;
                const item = data.lists[listIndex].items.find(i => i.id === itemId);
                if (item) {
                    newItemsOrder.push(item);
                }
            });
            
            data.lists[listIndex].items = newItemsOrder;
            saveData();
        }
    }
}

// Determine where to position a dragged element
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Parse Markdown link format [title](url)
function parseMarkdownLink(text) {
    // More precise regex for Markdown links
    const mdLinkRegex = /^\s*\[([^\]]+)\]\(([^)]+)\)\s*$/;
    const match = text.match(mdLinkRegex);
    
    if (match && match[2].trim()) {
        return {
            title: match[1].trim(),
            url: match[2].trim()
        };
    }
    
    return null;
}

function performSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();

    if (!searchTerm) {
        exitSearchMode();
        return;
    }

    // Set search mode
    document.body.classList.add('search-mode');

    // Always clear highlights from all list titles first (before the loop)
    document.querySelectorAll('.list-title').forEach(titleEl => {
        highlightMatches(titleEl, ""); // Clear highlights
    });

    // Track which list titles should be highlighted
    const listTitlesToHighlight = [];

    // Loop through all lists and items
    data.lists.forEach(list => {
        const listElement = document.querySelector(`.list[data-id="${list.id}"]`);
        let hasMatchingItems = false;

        if (listElement) {
            // Check if list name matches search term
            const listMatches = list.name.toLowerCase().includes(searchTerm);

            // Check each item in the list
            list.items.forEach(item => {
                const itemElement = listElement.querySelector(`.list-item[data-id="${item.id}"]`);
                if (itemElement) {
                    const titleMatches = item.title.toLowerCase().includes(searchTerm);
                    const descriptionMatches = item.description && item.description.toLowerCase().includes(searchTerm);
                    const urlMatches = item.url.toLowerCase().includes(searchTerm);

                    if (titleMatches || descriptionMatches || urlMatches) {
                        itemElement.classList.remove('hidden');
                        hasMatchingItems = true;

                        // Highlight matching text (optional)
                        highlightMatches(itemElement, searchTerm);
                    } else {
                        itemElement.classList.add('hidden');
                    }
                }
            });

            // Show/hide the list based on if it or any of its items match
            if (listMatches || hasMatchingItems) {
                listElement.classList.remove('hidden');

                // If the list is collapsed but has matching items, expand it
                if (list.collapsed && hasMatchingItems) {
                    // Temporarily expand for search results
                    listElement.classList.remove('list-collapsed');
                    listElement.dataset.wasCollapsed = "true";
                }

                // Collect list titles to highlight after the loop
                if (listMatches) {
                    const listTitle = listElement.querySelector('.list-title');
                    if (listTitle) {
                        listTitlesToHighlight.push(listTitle);
                    }
                }
            } else {
                listElement.classList.add('hidden');
            }
        }
    });

    // Highlight only matching list titles (after the loop)
    listTitlesToHighlight.forEach(listTitle => {
        highlightMatches(listTitle, searchTerm);
    });
}

function exitSearchMode() {
    searchBar.value = '';
    document.body.classList.remove('search-mode');
    
    // Show all lists and items
    document.querySelectorAll('.list, .list-item').forEach(el => {
        el.classList.remove('hidden');
    });

    // Remove any highlighting
    document.querySelectorAll('.search-highlight').forEach(span => {
        const parent = span.parentNode;
        parent.replaceChild(document.createTextNode(span.textContent), span);
        parent.normalize(); // Merge adjacent text nodes
    });

    // Restore collapsed state for lists that were temporarily expanded
    document.querySelectorAll('.list[data-wasCollapsed="true"]').forEach(listEl => {
        listEl.classList.add('list-collapsed');
        listEl.removeAttribute('data-wasCollapsed');
    });
}

function highlightMatches(element, searchTerm) {
    // Remove all highlights recursively
    function removeHighlights(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList.contains('search-highlight')) {
                const text = document.createTextNode(node.textContent);
                node.parentNode.replaceChild(text, node);
                return;
            }
            Array.from(node.childNodes).forEach(removeHighlights);
        }
    }

    // Highlight text nodes, skipping <br>
    function highlightTextNode(node, regex) {
        if (node.nodeType === Node.TEXT_NODE && node.data.trim() !== '') {
            const text = node.data;
            const matches = text.match(regex);
            
            if (!matches) return; // No matches found in this text node
            
            const frag = document.createDocumentFragment();
            let lastIndex = 0;
            
            text.replace(regex, (match, offset) => {
                // Add text before match
                if (offset > lastIndex) {
                    frag.appendChild(
                        document.createTextNode(text.slice(lastIndex, offset))
                    );
                }
                
                // Add highlighted match
                const span = document.createElement('span');
                span.className = 'search-highlight';
                span.textContent = match;
                frag.appendChild(span);
                
                lastIndex = offset + match.length;
            });
            
            // Add remaining text after last match
            if (lastIndex < text.length) {
                frag.appendChild(
                    document.createTextNode(text.slice(lastIndex))
                );
            }
            
            node.parentNode.replaceChild(frag, node);
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
            Array.from(node.childNodes).forEach(child => highlightTextNode(child, regex));
        }
    }

    // Decide which elements to highlight
    const elementsToHighlight = [];
    if (element.classList.contains('list-title')) {
        elementsToHighlight.push(element);
    } else if (element.classList.contains('list-item')) {
        const titleAnchor = element.querySelector('.link-title a');
        const description = element.querySelector('.link-description');
        const url = element.querySelector('.link-url');
        if (titleAnchor) elementsToHighlight.push(titleAnchor);
        if (description && description.textContent !== 'Add a description...') elementsToHighlight.push(description);
        if (url) elementsToHighlight.push(url);
    }

    elementsToHighlight.forEach(el => {
        removeHighlights(el);
        if (!searchTerm) return;
        const safeTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(safeTerm, 'gi');
        highlightTextNode(el, regex);
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init);