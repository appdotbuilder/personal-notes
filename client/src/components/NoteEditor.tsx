import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Star,
  StarOff,
  Save,
  Trash2,
  Tag,
  Bold,
  Italic,
  Underline,
  Code,
  List,
  ListOrdered,
  Quote,
  Image,
  CheckSquare,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Link,
  Undo,
  Redo
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { NoteWithTags, Tag as TagType } from '../../../server/src/schema';

interface NoteEditorProps {
  note: NoteWithTags;
  tags: TagType[];
  onUpdateNote: (noteId: number, updates: Partial<NoteWithTags>) => Promise<void>;
  onDeleteNote: () => void;
}

// Rich Text Editor Toolbar Component
function EditorToolbar({
  onFormat,
  onInsert
}: {
  onFormat: (format: string) => void;
  onInsert: (type: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
      {/* Text Formatting */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onFormat('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onFormat('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onFormat('underline')}
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onFormat('code')}
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Headings */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onFormat('heading1')}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onFormat('heading2')}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onFormat('heading3')}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Lists and Blocks */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onFormat('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onFormat('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onInsert('checklist')}
          title="Checklist"
        >
          <CheckSquare className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onFormat('blockquote')}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Insert Elements */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onInsert('image')}
          title="Insert Image"
        >
          <Image className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onInsert('codeBlock')}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onInsert('link')}
          title="Insert Link"
        >
          <Link className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onFormat('undo')}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onFormat('redo')}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function NoteEditor({ note, tags, onUpdateNote, onDeleteNote }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedTags, setSelectedTags] = useState<TagType[]>(note.tags || []);

  // Update local state when note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setSelectedTags(note.tags || []);
    setHasUnsavedChanges(false);
  }, [note.id, note.title, note.content, note.tags]);

  // Track changes
  useEffect(() => {
    const hasChanges = 
      title !== note.title || 
      content !== note.content ||
      JSON.stringify(selectedTags.map(t => t.id).sort()) !== 
      JSON.stringify((note.tags || []).map(t => t.id).sort());
    setHasUnsavedChanges(hasChanges);
  }, [title, content, selectedTags, note.title, note.content, note.tags]);

  // Auto-save functionality
  const saveNote = useCallback(async () => {
    if (!hasUnsavedChanges || isSaving) return;
    
    setIsSaving(true);
    try {
      await onUpdateNote(note.id, {
        title: title.trim() || 'Untitled',
        content,
        // Note: Tag updates would require separate API calls to manage note-tag relationships
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [hasUnsavedChanges, isSaving, note.id, title, content, onUpdateNote]);

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const timeoutId = setTimeout(() => {
      saveNote();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [hasUnsavedChanges, saveNote]);

  const handleToggleFavorite = async () => {
    await onUpdateNote(note.id, { is_favorite: !note.is_favorite });
  };

  // Placeholder functions for rich text formatting
  const handleFormat = (format: string) => {
    console.log('Format:', format);
    // In a real implementation, this would interact with Tiptap editor
    // For now, we'll add some basic text formatting to the content
    if (format === 'bold') {
      setContent(prev => prev + '\n**Bold text**');
    } else if (format === 'heading1') {
      setContent(prev => prev + '\n# Heading 1');
    } else if (format === 'heading2') {
      setContent(prev => prev + '\n## Heading 2');
    }
  };

  const handleInsert = (type: string) => {
    console.log('Insert:', type);
    // Placeholder for inserting different content types
    if (type === 'checklist') {
      setContent(prev => prev + '\n- [ ] Checklist item\n- [ ] Another item');
    } else if (type === 'codeBlock') {
      setContent(prev => prev + '\n```\n// Code goes here\n```');
    } else if (type === 'image') {
      setContent(prev => prev + '\n![Image description](image-url)');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleFavorite}
            >
              {note.is_favorite ? (
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
              ) : (
                <StarOff className="h-4 w-4 text-gray-400" />
              )}
            </Button>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {hasUnsavedChanges && (
                <span className="text-orange-600">●</span>
              )}
              {isSaving ? (
                <span>Saving...</span>
              ) : (
                <span>Last saved: {formatDate(note.updated_at)}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={saveNote} 
              disabled={!hasUnsavedChanges || isSaving}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onDeleteNote}
              size="sm"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Title Input */}
        <Input
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="text-lg font-semibold border-none shadow-none p-0 focus-visible:ring-0"
        />

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedTags.map((tag: TagType) => (
            <Badge 
              key={tag.id} 
              variant="outline"
              style={{ 
                borderColor: tag.color || undefined,
                color: tag.color || undefined 
              }}
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag.name}
            </Badge>
          ))}
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6">
                <Tag className="h-3 w-3 mr-1" />
                Add tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Add tags</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {tags.map((tag: TagType) => (
                    <div 
                      key={tag.id}
                      className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => {
                        const isSelected = selectedTags.some(t => t.id === tag.id);
                        if (isSelected) {
                          setSelectedTags(prev => prev.filter(t => t.id !== tag.id));
                        } else {
                          setSelectedTags(prev => [...prev, tag]);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTags.some(t => t.id === tag.id)}
                        readOnly
                        className="rounded"
                      />
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          borderColor: tag.color || undefined,
                          color: tag.color || undefined 
                        }}
                      >
                        {tag.name}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Rich Text Editor Toolbar */}
      <EditorToolbar onFormat={handleFormat} onInsert={handleInsert} />

      {/* Content Editor */}
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-4">
            <Textarea
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
              placeholder="Start writing your note..."
              className="min-h-[400px] border-none shadow-none resize-none focus-visible:ring-0 text-base leading-relaxed"
            />
            
            {/* Content Preview Hints */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Rich Text Features</h4>
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>**bold text**</strong> - Bold formatting</p>
                <p><strong># Heading 1</strong> - Large heading</p>
                <p><strong>## Heading 2</strong> - Medium heading</p>
                <p><strong>- [ ] task</strong> - Checklist item</p>
                <p><strong>```code```</strong> - Code block</p>
                <p><strong>![alt](url)</strong> - Image embed</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between">
        <span>Created: {formatDate(note.created_at)}</span>
        <span>Characters: {content.length}</span>
      </div>
    </div>
  );
}