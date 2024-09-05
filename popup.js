
// 弹出窗口脚本逻辑
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM fully loaded and parsed");
  
  // 获取所有待分组的插件
  chrome.management.getAll(function(extensions) {
    console.log("Retrieved all extensions:", extensions.length);
    const allPluginsContainer = document.getElementById('extensions-list');
    if (!allPluginsContainer) {
      console.error("Could not find #extensions-list element");
      return;
    }
    extensions.forEach(function(extension) {
      const pluginIcon = createPluginIcon(extension);
      allPluginsContainer.appendChild(pluginIcon);
    });
    console.log("Added all plugin icons to the container");
    
    // 为所有插件图标添加点击事件监听器
    document.querySelectorAll('.plugin-icon').forEach(addPluginIconClickListener);

    // 加载保存的分组信息
    loadGroups().then(() => {
      console.log("Groups loaded successfully");
      // 在加载完成后,保存一次分组信息,以确保所有数据都是最新的
      saveGroups();
    }).catch(error => {
      console.error("Error loading groups:", error);
    });
  });

  // 更新这里的按钮 ID
  const createGroupButton = document.getElementById('create-group');
  if (createGroupButton) {
    createGroupButton.addEventListener('click', function() {
      createGroup();
    });
  } else {
    console.error("Could not find #create-group button");
  }

  // 添加保存按钮的事件监听器
  const saveButton = document.getElementById('save-groups');
  saveButton.addEventListener('click', function() {
    saveGroups().then(() => {
      showSaveConfirmation();
    }).catch(error => {
      console.error('Error saving groups:', error);
    });
  });

  // 添加帮助图标的事件监听器
  const helpIcon = document.getElementById('help-icon');
  const helpPopup = document.getElementById('help-popup');
  const closeHelpButton = document.getElementById('close-help');

  helpIcon.addEventListener('click', function() {
    helpPopup.classList.remove('hidden');
  });

  closeHelpButton.addEventListener('click', function() {
    helpPopup.classList.add('hidden');
  });

  // 点击弹出窗口外部也可以关闭
  helpPopup.addEventListener('click', function(event) {
    if (event.target === helpPopup) {
      helpPopup.classList.add('hidden');
    }
  });

  // 实现拖放功能
  implementDragAndDrop();
});

function createPluginIcon(extension) {
  console.log("Creating plugin icon for:", extension.name, "with id:", extension.id);
  const icon = document.createElement('div');
  icon.className = 'plugin-icon';
  icon.classList.add(`plugin-${extension.id}`);
  icon.classList.add(extension.enabled ? 'enabled' : 'disabled');
  icon.draggable = true;
  icon.dataset.id = extension.id;
  icon.title = extension.name;
  
  const img = document.createElement('img');
  img.src = extension.icons && extension.icons.length > 0 ? extension.icons[0].url : 'default-icon.png';
  img.draggable = false;
  icon.appendChild(img);

  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'status-indicator';
  icon.appendChild(statusIndicator);

  addPluginIconClickListener(icon);

  return icon;
}

function addPluginIconClickListener(icon) {
  icon.addEventListener('click', function(event) {
    event.preventDefault(); // 防止触发拖拽
    const pluginId = this.dataset.id;
    const isEnabled = this.classList.contains('enabled');
    togglePlugin(pluginId, !isEnabled);
  });
}

function createGroup(name = '新分组') {
  console.log("Creating new group");
  const groupsContainer = document.getElementById('groups-container');
  if (!groupsContainer) {
    console.error("Could not find #groups-container element");
    return;
  }
  const group = document.createElement('div');
  group.className = 'group';
  group.draggable = true;
  
  const header = document.createElement('div');
  header.className = 'group-header';
  header.draggable = true; // 使整个头部可拖动
  
  const groupName = document.createElement('span');
  groupName.textContent = name;
  groupName.contentEditable = true;
  groupName.addEventListener('blur', function() {
    if (this.textContent.trim() === '') {
      this.textContent = '新分组';
    }
    saveGroups();
  });
  header.appendChild(groupName);

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'group-buttons';

  // 添加切换按钮
  const toggleButton = document.createElement('button');
  toggleButton.textContent = '▼';
  toggleButton.className = 'toggle-button';
  toggleButton.addEventListener('click', function() {
    toggleGroupContent(group);
  });
  buttonContainer.appendChild(toggleButton);

  const enableAllButton = document.createElement('button');
  enableAllButton.textContent = '一键启用';
  enableAllButton.className = 'enable-all-button';
  enableAllButton.addEventListener('click', function() {
    enableAllInGroup(group.querySelector('.group-content'));
  });
  buttonContainer.appendChild(enableAllButton);

  const dissolveButton = document.createElement('button');
  dissolveButton.textContent = '解散分组';
  dissolveButton.className = 'dissolve-button';
  dissolveButton.addEventListener('click', function() {
    dissolveGroup(group);
  });
  buttonContainer.appendChild(dissolveButton);

  header.appendChild(buttonContainer);

  const content = document.createElement('div');
  content.className = 'group-content';
  
  group.appendChild(header);
  group.appendChild(content);

  groupsContainer.appendChild(group);
  console.log("New group added to the container");
  saveGroups();
  
  return group;
}

// 添加切换分组内容的函数
function toggleGroupContent(group) {
  const content = group.querySelector('.group-content');
  const toggleButton = group.querySelector('.toggle-button');
  if (content.style.display === 'none') {
    content.style.display = 'flex';
    toggleButton.textContent = '▼';
  } else {
    content.style.display = 'none';
    toggleButton.textContent = '▶';
  }
}

function dissolveGroup(group) {
  const allPluginsContainer = document.getElementById('extensions-list');
  const plugins = group.querySelectorAll('.plugin-icon');
  
  plugins.forEach(plugin => {
    allPluginsContainer.appendChild(plugin);
  });

  group.remove();
  saveGroups();
}

function implementDragAndDrop() {
  let draggedElement = null;

  document.addEventListener('dragstart', function(event) {
    if (event.target.classList.contains('plugin-icon')) {
      draggedElement = event.target;
      event.dataTransfer.setData('text/plain', 'plugin');
    } else if (event.target.closest('.group-header')) {
      draggedElement = event.target.closest('.group');
      event.dataTransfer.setData('text/plain', 'group');
    }
    if (draggedElement) {
      draggedElement.style.opacity = '0.5';
    }
  });

  document.addEventListener('dragend', function(event) {
    if (draggedElement) {
      draggedElement.style.opacity = '1';
      draggedElement = null;
    }
  });

  document.addEventListener('dragover', function(event) {
    event.preventDefault();
    const target = event.target.closest('.group-content') || event.target.closest('.group') || event.target.closest('#extensions-list');
    if (target) {
      event.dataTransfer.dropEffect = 'move';
    }
  });

  document.addEventListener('drop', function(event) {
    event.preventDefault();
    if (!draggedElement) return;

    const target = event.target.closest('.group-content') || event.target.closest('.group') || event.target.closest('#extensions-list');
    if (!target) return;

    const dragType = event.dataTransfer.getData('text/plain');

    if (dragType === 'plugin') {
      if (target.classList.contains('group-content') || target.id === 'extensions-list') {
        target.appendChild(draggedElement);
      }
    } else if (dragType === 'group') {
      const groupsContainer = document.getElementById('groups-container');
      if (target.classList.contains('group') && target !== draggedElement) {
        if (isBeforeTarget(event, target)) {
          groupsContainer.insertBefore(draggedElement, target);
        } else {
          groupsContainer.insertBefore(draggedElement, target.nextSibling);
        }
      }
    }

    saveGroups();
  });
}

function isBeforeTarget(event, target) {
  const targetRect = target.getBoundingClientRect();
  const mouseY = event.clientY;
  const threshold = targetRect.top + targetRect.height / 2;
  return mouseY < threshold;
}

function togglePlugin(id, enable) {
  chrome.management.setEnabled(id, enable, function() {
    if (chrome.runtime.lastError) {
      console.error('Error toggling plugin:', chrome.runtime.lastError);
    } else {
      const icon = document.querySelector(`.plugin-icon[data-id="${id}"]`);
      if (icon) {
        icon.classList.toggle('enabled', enable);
        icon.classList.toggle('disabled', !enable);
        console.log(`Plugin ${id} ${enable ? 'enabled' : 'disabled'}`);
        saveGroups();
      }
    }
  });
}

function enableAllInGroup(groupContent) {
  const plugins = groupContent.querySelectorAll('.plugin-icon');
  plugins.forEach(plugin => {
    const pluginId = plugin.dataset.id;
    chrome.management.setEnabled(pluginId, true, function() {
      if (chrome.runtime.lastError) {
        console.error('Error enabling plugin:', chrome.runtime.lastError);
      } else {
        plugin.classList.add('enabled');
        plugin.classList.remove('disabled');
        console.log(`Plugin ${pluginId} enabled`);
      }
    });
  });
  saveGroups();
}

// 保存分组信息
function saveGroups() {
  console.log("Saving groups");
  const groups = document.querySelectorAll('.group');
  const groupsData = Array.from(groups).map(group => {
    const name = group.querySelector('.group-header span').textContent;
    const plugins = Array.from(group.querySelectorAll('.plugin-icon')).map(plugin => plugin.dataset.id);
    return { name, plugins };
  });

  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ groups: groupsData }, function() {
      if (chrome.runtime.lastError) {
        console.error('Error saving groups:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        console.log('Groups saved successfully');
        validateSavedGroups();
        resolve();
      }
    });
  });
}

// 加载分组信息
function loadGroups() {
  console.log("Attempting to load groups");
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('groups', function(data) {
      if (chrome.runtime.lastError) {
        console.error('Error loading groups:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        console.log("Retrieved data from storage:", data);
        if (data.groups && Array.isArray(data.groups) && data.groups.length > 0) {
          console.log(`Found ${data.groups.length} saved groups`);
          const groupsContainer = document.getElementById('groups-container');
          if (!groupsContainer) {
            console.error("Could not find #groups-container element");
            reject(new Error("Could not find #groups-container element"));
            return;
          }
          groupsContainer.innerHTML = ''; // Clear existing groups
          
          data.groups.forEach((groupData, index) => {
            console.log(`Creating group ${index + 1}:`, groupData.name);
            const group = createGroup(groupData.name);
            const groupContent = group.querySelector('.group-content');
            
            groupData.plugins.forEach(pluginId => {
              const pluginElement = document.querySelector(`.plugin-icon[data-id="${pluginId}"]`);
              if (pluginElement) {
                groupContent.appendChild(pluginElement);
              } else {
                console.warn(`Plugin with id ${pluginId} not found`);
              }
            });
          });
        } else {
          console.log("No valid saved groups found");
        }
        resolve();
      }
    });
  });
}

function validateSavedGroups() {
  chrome.storage.local.get('groups', function(data) {
    if (chrome.runtime.lastError) {
      console.error('Error validating groups:', chrome.runtime.lastError);
    } else {
      console.log("Validating saved groups:", data.groups);
      if (data.groups && Array.isArray(data.groups)) {
        data.groups.forEach((group, index) => {
          console.log(`Group ${index + 1}: ${group.name}`);
          console.log(`  Plugins: ${group.plugins.length}`);
          group.plugins.forEach((pluginId, pluginIndex) => {
            console.log(`    Plugin ${pluginIndex + 1}: ${pluginId}`);
          });
        });
      } else {
        console.warn("No valid groups data found");
      }
    }
  });
}

// 如果你想保留这个函数以便将来使用,可以这样修改:
function removeEmptyGroups() {
  const groupsContainer = document.getElementById('groups-container');
  const groups = Array.from(groupsContainer.children);
  groups.forEach((group, index) => {
    const pluginCount = group.querySelectorAll('.group-content .plugin-icon').length;
    console.log(`Checking group ${index + 1}: ${pluginCount} plugins`);
    // 不再删除空分组,只记录日志
    if (pluginCount === 0) {
      console.log(`Group ${index + 1} is empty`);
    }
  });
  // 不再自动保存,因为我们没有做任何更改
  // saveGroups();
}

// 添加保存确认提示函数
function showSaveConfirmation() {
  const saveButton = document.getElementById('save-groups');
  const originalText = saveButton.textContent;
  saveButton.textContent = '已保存';
  saveButton.disabled = true;
  setTimeout(() => {
    saveButton.textContent = originalText;
    saveButton.disabled = false;
  }, 2000);
}

window.onerror = function(message, source, lineno, colno, error) {
  console.error("Global error:", message, "at", source, ":", lineno, ":", colno);
  console.error("Error object:", error);
};

chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.get('groups', function(data) {
    if (!data.groups) {
      chrome.storage.local.set({groups: []}, function() {
        console.log('Initialized empty groups array');
      });
    }
  });
});
