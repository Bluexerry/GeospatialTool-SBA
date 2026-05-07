import React, { useState, useEffect, useRef, useCallback } from 'react';
import { setChonkyDefaults } from 'chonky';
import { ChonkyIconFA } from 'chonky-icon-fontawesome';
import { FullFileBrowser, ChonkyActions } from 'chonky';
import LoadingBar from 'react-top-loading-bar';
import axios from 'axios';
import { FILE_API_URL } from '@/config';

setChonkyDefaults({ iconComponent: ChonkyIconFA });

const ROOT_FOLDER_ID = 1; // matches the seeded 'SBA' folder in init.sql

export default function FileBrowser({ shouldLoad }) {
  const [files, setFiles] = useState([]);
  const [folderChain, setFolderChain] = useState([{ id: ROOT_FOLDER_ID, name: 'SBA' }]);
  const [currentFolderId, setCurrentFolderId] = useState(ROOT_FOLDER_ID);
  const ref = useRef(null);

  const startLoading = () => ref.current && ref.current.continuousStart();
  const stopLoading  = () => ref.current && ref.current.complete();

  const fileActions = React.useMemo(() => [
    ChonkyActions.CreateFolder,
    ChonkyActions.UploadFiles,
    ChonkyActions.DownloadFiles,
    ChonkyActions.DeleteFiles,
    ChonkyActions.OpenParentFolder,
    ChonkyActions.OpenFiles,
  ], []);

  const buildFolderChain = useCallback(async (folderId) => {
    const chain = [];
    let current = folderId;
    const seen = new Set();
    while (current !== null && !seen.has(current)) {
      seen.add(current);
      try {
        const { data } = await axios.get(`${FILE_API_URL}/api/folders`, { params: { parentId: current } });
        if (data.current_folder) {
          chain.unshift({ id: data.current_folder.id, name: data.current_folder.name });
          current = data.current_folder.parent_id;
        } else {
          current = null;
        }
      } catch {
        current = null;
      }
    }
    chain.unshift({ id: ROOT_FOLDER_ID, name: 'SBA' });
    return chain;
  }, []);

  const loadFolder = useCallback(async (folderId) => {
    startLoading();
    try {
      const { data } = await axios.get(`${FILE_API_URL}/api/folders`, { params: { parentId: folderId } });
      setFiles([
        ...data.folders.map(f => ({ id: f.id, name: f.name, isDir: true })),
        ...data.files.map(f => ({ id: f.id, name: f.name, isDir: false })),
      ]);
      const chain = await buildFolderChain(folderId);
      setFolderChain(chain);
      setCurrentFolderId(folderId);
    } catch {
      // folder load failed (backend offline or network error)
    } finally {
      stopLoading();
    }
  }, [buildFolderChain]);

  const hasLoaded = useRef(false);

  useEffect(() => {
    if (shouldLoad && !hasLoaded.current) {
      hasLoaded.current = true;
      loadFolder(ROOT_FOLDER_ID);
    }
  }, [loadFolder, shouldLoad]);

  const handleAction = useCallback(async (data) => {
    const startFileUpload = async (filesToUpload) => {
      const formData = new FormData();
      for (const f of filesToUpload) formData.append('files', f);
      formData.append('folderId', currentFolderId);
      await axios.post(`${FILE_API_URL}/api/files`, formData);
      loadFolder(currentFolderId);
    };

    const handleDelete = async (filesToDelete, foldersToDelete) => {
      if (filesToDelete.length > 0) {
        await axios.delete(`${FILE_API_URL}/api/files`, { data: { fileIds: filesToDelete.map(f => f.id) } });
      }
      if (foldersToDelete.length > 0) {
        await axios.delete(`${FILE_API_URL}/api/folders`, { data: { folderIds: foldersToDelete.map(f => f.id) } });
      }
      loadFolder(currentFolderId);
    };

    const handleDownload = async (fileId, fileName) => {
      const resp = await axios.get(`${FILE_API_URL}/api/files/${fileId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', fileName);
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    startLoading();
    try {
      const file = (data.payload && data.payload.files && data.payload.files[0]) ||
                   (data.state && data.state.selectedFiles && data.state.selectedFiles[0]);
      switch (data.id) {
        case ChonkyActions.DeleteFiles.id:
          await handleDelete(
            data.state.selectedFiles.filter(f => !f.isDir),
            data.state.selectedFiles.filter(f => f.isDir)
          );
          break;
        case ChonkyActions.OpenParentFolder.id: {
          const parent = folderChain[folderChain.length - 2];
          if (parent) loadFolder(parent.id);
          break;
        }
        case ChonkyActions.OpenFiles.id:
          if (file && file.isDir) loadFolder(file.id);
          break;
        case ChonkyActions.DownloadFiles.id:
          if (file && !file.isDir) await handleDownload(file.id, file.name);
          break;
        case ChonkyActions.CreateFolder.id: {
          const folderName = prompt('Nombre de la nueva carpeta:');
          if (folderName) {
            await axios.post(`${FILE_API_URL}/api/folders`, { name: folderName, parentId: currentFolderId });
            loadFolder(currentFolderId);
          }
          break;
        }
        case ChonkyActions.UploadFiles.id: {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.onchange = () => startFileUpload(input.files);
          input.click();
          break;
        }
        default: {
          // Handle search action (may not exist in all Chonky builds)
          if (ChonkyActions.Search && data.id === ChonkyActions.Search.id) {
            const query = prompt('Buscar archivo:');
            if (query) {
              const { data: results } = await axios.get(`${FILE_API_URL}/api/search`, { params: { query } });
              setFiles(results);
              setFolderChain([{ id: null, name: 'Resultados de búsqueda' }]);
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error handling action', error);
    } finally {
      stopLoading();
    }
  }, [currentFolderId, folderChain, loadFolder]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <LoadingBar color="#3f51b5" ref={ref} />
      <FullFileBrowser
        files={files}
        folderChain={folderChain}
        fileActions={fileActions}
        onFileAction={handleAction}
        disableDefaultFileActions={true}
      />
    </div>
  );
}
