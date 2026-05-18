document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const statusMessage = document.getElementById('upload-status');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const fileList = document.getElementById('file-list');
    const refreshBtn = document.getElementById('refresh-btn');

    // Initial load
    fetchFiles();

    // Event Listeners for Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    // Event Listener for Click Upload
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    refreshBtn.addEventListener('click', () => {
        fetchFiles();
        refreshBtn.style.transform = `rotate(${Math.random() * 360 + 180}deg)`;
    });

    function handleFiles(files) {
        if (files.length === 0) return;
        
        let validFiles = [];
        for (let i = 0; i < files.length; i++) {
            if (files[i].type !== 'application/pdf') {
                showStatus(`Warning: ${files[i].name} is not a PDF and was skipped.`, 'error');
            } else {
                validFiles.push(files[i]);
            }
        }

        if (validFiles.length > 0) {
            uploadMultipleFiles(validFiles);
        }
    }

    function uploadMultipleFiles(files) {
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        showStatus(`Uploading ${files.length} file(s)...`, '');

        let completed = 0;
        let hasError = false;

        files.forEach((file, index) => {
            const url = '/api/upload';
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            
            formData.append('pdf', file);

            // Very simple progress calculation: just based on completion count for multiple files
            xhr.addEventListener('load', () => {
                completed++;
                progressBar.style.width = (completed / files.length) * 100 + '%';
                
                if (xhr.status !== 200) {
                    hasError = true;
                }

                if (completed === files.length) {
                    finalizeUpload(hasError);
                }
            });

            xhr.addEventListener('error', () => {
                completed++;
                hasError = true;
                progressBar.style.width = (completed / files.length) * 100 + '%';
                
                if (completed === files.length) {
                    finalizeUpload(hasError);
                }
            });

            xhr.open('POST', url, true);
            xhr.send(formData);
        });
    }

    function finalizeUpload(hasError) {
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 1000);

        if (!hasError) {
            showStatus('All files uploaded successfully!', 'success');
        } else {
            showStatus('Upload finished, but some files failed to upload.', 'error');
        }

        fetchFiles(); // Refresh list
        fileInput.value = ''; // Clear input
        
        // Clear success message after 3 seconds
        setTimeout(() => {
            statusMessage.textContent = '';
            statusMessage.className = 'status-message';
        }, 3000);
    }

    function showStatus(msg, type) {
        statusMessage.textContent = msg;
        statusMessage.className = `status-message ${type}`;
    }

    function fetchFiles() {
        fetch('/api/files')
            .then(res => res.json())
            .then(files => {
                renderFiles(files);
            })
            .catch(err => {
                fileList.innerHTML = `<div class="error">Failed to load files</div>`;
            });
    }

    function renderFiles(files) {
        if (files.length === 0) {
            fileList.innerHTML = `<div class="empty-state">No PDFs uploaded yet.</div>`;
            return;
        }

        fileList.innerHTML = '';
        files.forEach((file, index) => {
            const sizeKB = (file.size / 1024).toFixed(2);
            const sizeDisplay = sizeKB > 1024 ? (sizeKB / 1024).toFixed(2) + ' MB' : sizeKB + ' KB';
            const dateDisplay = new Date(file.date).toLocaleDateString(undefined, { 
                year: 'numeric', month: 'short', day: 'numeric', 
                hour: '2-digit', minute: '2-digit'
            });

            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.style.animationDelay = `${index * 0.05}s`;
            
            // Clean up original name if it includes the timestamp prepended by server
            let displayName = file.originalName;
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">📄</div>
                    <div class="file-details">
                        <div class="file-name" title="${displayName}">${displayName.length > 40 ? displayName.substring(0, 37) + '...' : displayName}</div>
                        <div class="file-meta">${sizeDisplay} • ${dateDisplay}</div>
                    </div>
                </div>
                <a href="${file.downloadUrl || '#'}" class="download-btn" ${!file.downloadUrl ? '' : 'download'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download
                </a>
            `;
            fileList.appendChild(fileItem);
        });
    }
});
