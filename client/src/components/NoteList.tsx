import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  StarOff, 
  MoreHorizontal, 
  Trash2,
  Clock,
  Tag
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { NoteWithTags } from '../../../server/src/schema';

interface NoteListProps {
  notes: NoteWithTags[];
  selectedNoteId: number | null;
  onNoteSelect: (noteId: number) => void;
  onToggleFavorite: (noteId: number) => void;
  onDeleteNote: (noteId: number) => void;
}

interface NoteItemProps {
  note: NoteWithTags;
  isSelected: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}

function NoteItem({ note, isSelected, onSelect, onToggleFavorite, onDelete }: NoteItemProps) {
  // Extract plain text preview from content (assuming it might be JSON from Tiptap)
  const getContentPreview = (content: string) => {
    try {
      // Try to parse as JSON first (Tiptap format)
      const parsed = JSON.parse(content);
      if (parsed.content) {
        // Extract text content from Tiptap JSON
        const extractText = (node: any): string => {
          if (node.text) return node.text;
          if (node.content) {
            return node.content.map((child: any) => extractText(child)).join('');
          }
          return '';
        };
        return extractText(parsed).trim();
      }
    } catch {
      // If not JSON, treat as plain text
      return content.trim();
    }
    return '';
  };

  const contentPreview = getContentPreview(note.content);
  const previewText = contentPreview.length > 100 
    ? contentPreview.substring(0, 100) + '...' 
    : contentPreview || 'No content';

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div 
      className={`group p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50 border-r-4 border-blue-500' : ''
      }`}
      onClick={onSelect}
    >
      {/* Note Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-medium truncate ${
            isSelected ? 'text-blue-900' : 'text-gray-900'
          }`}>
            {note.title || 'Untitled'}
          </h3>
          
          {/* Date and favorite indicator */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {formatDate(note.updated_at)}
            </div>
            {note.is_favorite && (
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
          >
            {note.is_favorite ? (
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
            ) : (
              <StarOff className="h-3 w-3 text-gray-400" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem 
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
              >
                {note.is_favorite ? (
                  <>
                    <StarOff className="h-4 w-4 mr-2" />
                    Unfavorite
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    Favorite
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content Preview */}
      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
        {previewText}
      </p>

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.slice(0, 3).map((tag) => (
            <Badge 
              key={tag.id} 
              variant="outline" 
              className="text-xs px-1 py-0"
              style={{ 
                borderColor: tag.color || undefined,
                color: tag.color || undefined 
              }}
            >
              <Tag className="h-2 w-2 mr-1" />
              {tag.name}
            </Badge>
          ))}
          {note.tags.length > 3 && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              +{note.tags.length - 3}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export function NoteList({
  notes,
  selectedNoteId,
  onNoteSelect,
  onToggleFavorite,
  onDeleteNote
}: NoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            No notes found
          </h3>
          <p className="text-xs text-gray-400">
            Create your first note to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {notes.map((note: NoteWithTags) => (
        <NoteItem
          key={note.id}
          note={note}
          isSelected={selectedNoteId === note.id}
          onSelect={() => onNoteSelect(note.id)}
          onToggleFavorite={() => onToggleFavorite(note.id)}
          onDelete={() => onDeleteNote(note.id)}
        />
      ))}
    </div>
  );
}