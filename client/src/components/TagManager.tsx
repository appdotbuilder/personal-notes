import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Tag,
  Palette,
  Save,
  X
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Tag as TagType, CreateTagInput } from '../../../server/src/schema';

interface TagManagerProps {
  tags: TagType[];
  onClose: () => void;
  onTagsChange: () => Promise<void>;
}

interface TagItemProps {
  tag: TagType;
  onEdit: (tag: TagType) => void;
  onDelete: (tagId: number) => void;
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange  
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#64748b', // slate
  '#78716c', // stone
];

function TagItem({ tag, onEdit, onDelete }: TagItemProps) {
  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <div 
          className="w-4 h-4 rounded-full border border-gray-300"
          style={{ backgroundColor: tag.color || '#gray' }}
        />
        <span className="text-sm font-medium">{tag.name}</span>
        <Badge variant="secondary" className="text-xs">
          {tag.id} {/* In real app, this would show usage count */}
        </Badge>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onEdit(tag)}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
          onClick={() => onDelete(tag.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function ColorPicker({ 
  selectedColor, 
  onColorChange 
}: { 
  selectedColor: string | null;
  onColorChange: (color: string | null) => void;
}) {
  return (
    <div>
      <Label className="text-sm font-medium mb-2 block">Color</Label>
      <div className="flex flex-wrap gap-2">
        {/* No color option */}
        <button
          type="button"
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
            selectedColor === null ? 'border-gray-900' : 'border-gray-300'
          }`}
          onClick={() => onColorChange(null)}
        >
          <X className="h-3 w-3 text-gray-400" />
        </button>
        
        {/* Preset colors */}
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`w-8 h-8 rounded-full border-2 ${
              selectedColor === color ? 'border-gray-900' : 'border-gray-300'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onColorChange(color)}
          />
        ))}
      </div>
    </div>
  );
}

export function TagManager({ tags, onClose, onTagsChange }: TagManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [formData, setFormData] = useState<CreateTagInput>({
    name: '',
    color: null
  });
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({ name: '', color: null });
    setIsCreating(false);
    setEditingTag(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsLoading(true);
    try {
      if (editingTag) {
        // Update existing tag
        await trpc.updateTag.mutate({
          id: editingTag.id,
          name: formData.name.trim(),
          color: formData.color
        });
      } else {
        // Create new tag
        await trpc.createTag.mutate({
          name: formData.name.trim(),
          color: formData.color
        });
      }
      
      await onTagsChange();
      resetForm();
    } catch (error) {
      console.error('Failed to save tag:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (tag: TagType) => {
    setFormData({
      name: tag.name,
      color: tag.color
    });
    setEditingTag(tag);
    setIsCreating(true);
  };

  const handleDelete = async (tagId: number) => {
    if (!confirm('Are you sure you want to delete this tag? It will be removed from all notes.')) {
      return;
    }

    setIsLoading(true);
    try {
      await trpc.deleteTag.mutate({ id: tagId });
      await onTagsChange();
    } catch (error) {
      console.error('Failed to delete tag:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Manage Tags
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Create/Edit Form */}
          {isCreating && (
            <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-lg mb-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tagName" className="text-sm font-medium mb-2 block">
                    Tag Name
                  </Label>
                  <Input
                    id="tagName"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setFormData(prev => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter tag name..."
                    className="w-full"
                    autoFocus
                  />
                </div>

                <ColorPicker
                  selectedColor={formData.color}
                  onColorChange={(color) => 
                    setFormData(prev => ({ ...prev, color }))
                  }
                />

                {/* Preview */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Preview</Label>
                  <Badge 
                    variant="outline"
                    style={{ 
                      borderColor: formData.color || undefined,
                      color: formData.color || undefined 
                    }}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {formData.name || 'Tag name'}
                  </Badge>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={!formData.name.trim() || isLoading}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingTag ? 'Update' : 'Create'} Tag
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Add Tag Button */}
          {!isCreating && (
            <Button 
              onClick={() => setIsCreating(true)}
              className="w-full mb-4"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Tag
            </Button>
          )}

          {/* Tags List */}
          <div className="space-y-2">
            {tags.length === 0 ? (
              <div className="text-center py-8">
                <Tag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  No tags yet
                </h3>
                <p className="text-xs text-gray-400">
                  Create your first tag to organize your notes
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    All Tags ({tags.length})
                  </h3>
                </div>
                {tags.map((tag: TagType) => (
                  <TagItem
                    key={tag.id}
                    tag={tag}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}