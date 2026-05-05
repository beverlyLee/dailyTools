import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, FileNode, SearchResult, NoteMetadata } from '@/types';

export const useNotesStore = defineStore('notes', () => {
  const fileTree = ref<FileNode | null>(null);
  const currentPath = ref<string>('');
  const currentContent = ref<string>('');
  const originalContent = ref<string>('');
  const hasUnsavedChanges = ref<boolean>(false);
  const searchResults = ref<SearchResult[]>([]);
  const searchQuery = ref<string>('');
  const notesDirectory = ref<string>('');
  const allNotesMetadata = ref<NoteMetadata[]>([]);

  const currentFileName = computed(() => {
    if (!currentPath.value) return '';
    const parts = currentPath.value.split(/[/\\]/);
    return parts[parts.length - 1] || '';
  });

  const currentNoteMetadata = computed(() => {
    if (!currentPath.value || !notesDirectory.value) return null;
    const fullPath = getFullPath(currentPath.value);
    return allNotesMetadata.value.find(n => n.file_path === fullPath) || null;
  });

  async function loadNotesDirectory() {
    try {
      notesDirectory.value = await api.getNotesDirectory();
    } catch (error) {
      console.error('Failed to load notes directory:', error);
    }
  }

  async function loadAllNotesMetadata() {
    try {
      allNotesMetadata.value = await api.getAllNotes();
    } catch (error) {
      console.error('Failed to load all notes metadata:', error);
    }
  }

  async function loadFileTree() {
    if (!notesDirectory.value) {
      await loadNotesDirectory();
    }
    try {
      fileTree.value = await api.getFileTree(notesDirectory.value);
    } catch (error) {
      console.error('Failed to load file tree:', error);
    }
  }

  function getFullPath(relativePath: string): string {
    if (!notesDirectory.value) return relativePath;
    const sep = notesDirectory.value.includes('\\') ? '\\' : '/';
    return notesDirectory.value + sep + relativePath;
  }

  async function openNote(relativePath: string) {
    const fullPath = getFullPath(relativePath);
    try {
      currentContent.value = await api.readFile(fullPath);
      originalContent.value = currentContent.value;
      currentPath.value = relativePath;
      hasUnsavedChanges.value = false;
      await loadAllNotesMetadata();
    } catch (error) {
      console.error('Failed to open note:', error);
    }
  }

  async function saveNote(): Promise<boolean> {
    if (!currentPath.value) return false;
    const fullPath = getFullPath(currentPath.value);
    try {
      await api.writeFile(fullPath, currentContent.value);
      originalContent.value = currentContent.value;
      hasUnsavedChanges.value = false;
      await loadAllNotesMetadata();
      return true;
    } catch (error) {
      console.error('Failed to save note:', error);
      return false;
    }
  }

  function updateContent(content: string) {
    currentContent.value = content;
    hasUnsavedChanges.value = content !== originalContent.value;
  }

  async function createNote(fileName: string): Promise<boolean> {
    if (!notesDirectory.value) {
      await loadNotesDirectory();
    }
    let name = fileName.trim();
    if (!name.endsWith('.md')) {
      name += '.md';
    }
    const fullPath = getFullPath(name);
    try {
      await api.createFile(fullPath, false);
      await loadFileTree();
      await openNote(name);
      return true;
    } catch (error) {
      console.error('Failed to create note:', error);
      return false;
    }
  }

  async function createFolder(folderName: string): Promise<boolean> {
    if (!notesDirectory.value) {
      await loadNotesDirectory();
    }
    const fullPath = getFullPath(folderName);
    try {
      await api.createFile(fullPath, true);
      await loadFileTree();
      return true;
    } catch (error) {
      console.error('Failed to create folder:', error);
      return false;
    }
  }

  async function deleteItem(relativePath: string): Promise<boolean> {
    const fullPath = getFullPath(relativePath);
    try {
      await api.deleteFile(fullPath);
      if (currentPath.value === relativePath) {
        currentPath.value = '';
        currentContent.value = '';
        originalContent.value = '';
        hasUnsavedChanges.value = false;
      }
      await loadFileTree();
      await loadAllNotesMetadata();
      return true;
    } catch (error) {
      console.error('Failed to delete item:', error);
      return false;
    }
  }

  async function renameItem(oldRelativePath: string, newRelativePath: string): Promise<boolean> {
    const oldFullPath = getFullPath(oldRelativePath);
    const newFullPath = getFullPath(newRelativePath);
    try {
      await api.renameFile(oldFullPath, newFullPath);
      if (currentPath.value === oldRelativePath) {
        currentPath.value = newRelativePath;
      }
      await loadFileTree();
      await loadAllNotesMetadata();
      return true;
    } catch (error) {
      console.error('Failed to rename item:', error);
      return false;
    }
  }

  async function searchNotes(query: string): Promise<void> {
    if (!query.trim()) {
      searchResults.value = [];
      return;
    }
    try {
      searchResults.value = await api.searchNotes(query);
    } catch (error) {
      console.error('Failed to search notes:', error);
      searchResults.value = [];
    }
  }

  function closeNote() {
    currentPath.value = '';
    currentContent.value = '';
    originalContent.value = '';
    hasUnsavedChanges.value = false;
  }

  return {
    fileTree,
    currentPath,
    currentContent,
    originalContent,
    hasUnsavedChanges,
    searchResults,
    searchQuery,
    notesDirectory,
    allNotesMetadata,
    currentFileName,
    currentNoteMetadata,
    loadNotesDirectory,
    loadAllNotesMetadata,
    loadFileTree,
    getFullPath,
    openNote,
    saveNote,
    updateContent,
    createNote,
    createFolder,
    deleteItem,
    renameItem,
    searchNotes,
    closeNote,
  };
});
