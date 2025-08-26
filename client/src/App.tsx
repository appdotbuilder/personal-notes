import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Search, 
  Star, 
  StarOff, 
  FileText, 
  FolderPlus, 
  Tag,
  Settings,
  BookOpen
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  NoteWithTags, 
  FolderWithChildren, 
  Tag as TagType,
  CreateNoteInput,
  CreateFolderInput,
  CreateTagInput
} from '../../server/src/schema';
import { FolderTree } from '@/components/FolderTree';
import { NoteEditor } from '@/components/NoteEditor';
import { NoteList } from '@/components/NoteList';
import { TagManager } from '@/components/TagManager';

function App() {
  // Core data state
  const [notes, setNotes] = useState<NoteWithTags[]>([]);
  const [folders, setFolders] = useState<FolderWithChildren[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  
  // UI state
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get selected note
  const selectedNote = notes.find(note => note.id === selectedNoteId) || null;

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [notesData, foldersData, tagsData] = await Promise.all([
        trpc.getNotes.query(),
        trpc.getFolders.query(),
        trpc.getTags.query()
      ]);
      
      setNotes(notesData);
      setFolders(foldersData);
      setTags(tagsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter notes based on current view
  const filteredNotes = notes.filter((note: NoteWithTags) => {
    if (showFavorites && !note.is_favorite) return false;
    if (selectedFolderId !== null && note.folder_id !== selectedFolderId) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return note.title.toLowerCase().includes(query) || 
             note.content.toLowerCase().includes(query);
    }
    return true;
  });

  // Create new note
  const createNote = async () => {
    setIsLoading(true);
    try {
      const newNoteData: CreateNoteInput = {
        title: 'Untitled Note',
        content: '',
        folder_id: selectedFolderId,
        is_favorite: false
      };
      
      const newNote = await trpc.createNote.mutate(newNoteData);
      setNotes((prev: NoteWithTags[]) => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new folder
  const createFolder = async (name: string, parentId: number | null = null) => {
    try {
      const newFolderData: CreateFolderInput = {
        name,
        parent_id: parentId
      };
      
      const newFolder = await trpc.createFolder.mutate(newFolderData);
      await loadData(); // Reload to get updated folder tree
      return newFolder;
    } catch (error) {
      console.error('Failed to create folder:', error);
      return null;
    }
  };

  // Update note
  const updateNote = async (noteId: number, updates: Partial<NoteWithTags>) => {
    try {
      const updatedNote = await trpc.updateNote.mutate({
        id: noteId,
        ...updates
      });
      
      setNotes((prev: NoteWithTags[]) => 
        prev.map((note: NoteWithTags) => 
          note.id === noteId ? { ...note, ...updatedNote } : note
        )
      );
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  // Toggle favorite status
  const toggleFavorite = async (noteId: number) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    await updateNote(noteId, { is_favorite: !note.is_favorite });
  };

  // Delete note
  const deleteNote = async (noteId: number) => {
    try {
      await trpc.deleteNote.mutate({ id: noteId });
      setNotes((prev: NoteWithTags[]) => prev.filter((note: NoteWithTags) => note.id !== noteId));
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">📝 My Notes</h1>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 space-y-2">
          <Button 
            onClick={createNote} 
            disabled={isLoading}
            className="w-full justify-start"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isLoading ? 'Creating...' : 'New Note'}
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant={showFavorites ? "default" : "outline"}
              onClick={() => {
                setShowFavorites(!showFavorites);
                setSelectedFolderId(null);
              }}
              className="flex-1 justify-start"
              size="sm"
            >
              <Star className="h-4 w-4 mr-2" />
              Favorites
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setShowTagManager(true)}
              size="sm"
            >
              <Tag className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Folder Tree */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <FolderTree
              folders={folders}
              selectedFolderId={selectedFolderId}
              onFolderSelect={setSelectedFolderId}
              onCreateFolder={createFolder}
              showFavorites={showFavorites}
              onShowFavoritesChange={() => {
                setShowFavorites(false);
                setSelectedFolderId(null);
              }}
            />
          </ScrollArea>
        </div>
      </div>

      {/* Middle Panel - Note List */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Notes Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-900">
              {showFavorites ? (
                <span className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Favorite Notes
                </span>
              ) : selectedFolderId ? (
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Folder Notes
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  All Notes
                </span>
              )}
            </h2>
            <Badge variant="secondary">
              {filteredNotes.length}
            </Badge>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <NoteList
              notes={filteredNotes}
              selectedNoteId={selectedNoteId}
              onNoteSelect={setSelectedNoteId}
              onToggleFavorite={toggleFavorite}
              onDeleteNote={deleteNote}
            />
          </ScrollArea>
        </div>
      </div>

      {/* Right Panel - Note Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            tags={tags}
            onUpdateNote={updateNote}
            onDeleteNote={() => deleteNote(selectedNote.id)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">
                Select a note to start editing
              </h3>
              <p className="text-gray-400 mb-6">
                Choose a note from the list or create a new one
              </p>
              <Button onClick={createNote} disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Note
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tag Manager Modal */}
      {showTagManager && (
        <TagManager
          tags={tags}
          onClose={() => setShowTagManager(false)}
          onTagsChange={loadData}
        />
      )}
    </div>
  );
}

export default App;