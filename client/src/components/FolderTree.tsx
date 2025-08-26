import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Folder, 
  FolderOpen, 
  FolderPlus, 
  Plus, 
  ChevronRight, 
  ChevronDown,
  MoreHorizontal,
  Edit2,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FolderWithChildren } from '../../../server/src/schema';

interface FolderTreeProps {
  folders: FolderWithChildren[];
  selectedFolderId: number | null;
  onFolderSelect: (folderId: number | null) => void;
  onCreateFolder: (name: string, parentId: number | null) => Promise<any>;
  showFavorites: boolean;
  onShowFavoritesChange: () => void;
}

interface FolderItemProps {
  folder: FolderWithChildren;
  level: number;
  selectedFolderId: number | null;
  onFolderSelect: (folderId: number | null) => void;
  onCreateFolder: (name: string, parentId: number | null) => Promise<any>;
}

function FolderItem({ 
  folder, 
  level, 
  selectedFolderId, 
  onFolderSelect, 
  onCreateFolder 
}: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreatingChild, setIsCreatingChild] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);

  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedFolderId === folder.id;
  const paddingLeft = level * 16 + 8;

  const handleCreateChildFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const result = await onCreateFolder(newFolderName.trim(), folder.id);
    if (result) {
      setNewFolderName('');
      setIsCreatingChild(false);
      setIsExpanded(true); // Expand parent to show new child
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    } else if (e.key === 'Escape') {
      setIsCreatingChild(false);
      setIsEditing(false);
      setNewFolderName('');
      setEditName(folder.name);
    }
  };

  return (
    <div>
      {/* Main Folder Row */}
      <div 
        className={`group flex items-center py-1 px-2 rounded-md cursor-pointer hover:bg-gray-50 ${
          isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 mr-1"
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : (
            <div className="h-3 w-3" />
          )}
        </Button>

        {/* Folder Icon */}
        <div className="mr-2">
          {isSelected || isExpanded ? (
            <FolderOpen className="h-4 w-4 text-blue-600" />
          ) : (
            <Folder className="h-4 w-4 text-gray-500" />
          )}
        </div>

        {/* Folder Name */}
        <div 
          className="flex-1 text-sm truncate"
          onClick={() => onFolderSelect(folder.id)}
        >
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => 
                handleKeyPress(e, () => setIsEditing(false))
              }
              onBlur={() => setIsEditing(false)}
              className="h-6 text-sm"
              autoFocus
            />
          ) : (
            <span className={`${isSelected ? 'font-medium text-blue-700' : 'text-gray-700'}`}>
              {folder.name}
            </span>
          )}
        </div>

        {/* Notes Count Badge */}
        {typeof folder.notes_count === 'number' && folder.notes_count > 0 && (
          <Badge variant="secondary" className="ml-2 text-xs">
            {folder.notes_count}
          </Badge>
        )}

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 ml-1 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setIsCreatingChild(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Subfolder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Create Child Folder Input */}
      {isCreatingChild && (
        <div 
          className="flex items-center py-1 px-2 ml-4"
          style={{ paddingLeft: `${paddingLeft + 16}px` }}
        >
          <FolderPlus className="h-4 w-4 text-gray-400 mr-2" />
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFolderName(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => 
              handleKeyPress(e, handleCreateChildFolder)
            }
            onBlur={() => {
              if (!newFolderName.trim()) {
                setIsCreatingChild(false);
              }
            }}
            className="h-6 text-sm"
            autoFocus
          />
        </div>
      )}

      {/* Child Folders */}
      {isExpanded && hasChildren && (
        <div>
          {folder.children!.map((childFolder: FolderWithChildren) => (
            <FolderItem
              key={childFolder.id}
              folder={childFolder}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onFolderSelect={onFolderSelect}
              onCreateFolder={onCreateFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  folders,
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  showFavorites,
  onShowFavoritesChange
}: FolderTreeProps) {
  const [isCreatingRoot, setIsCreatingRoot] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Filter to show only root folders (no parent_id)
  const rootFolders = folders.filter((folder: FolderWithChildren) => folder.parent_id === null);

  const handleCreateRootFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const result = await onCreateFolder(newFolderName.trim(), null);
    if (result) {
      setNewFolderName('');
      setIsCreatingRoot(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateRootFolder();
    } else if (e.key === 'Escape') {
      setIsCreatingRoot(false);
      setNewFolderName('');
    }
  };

  return (
    <div className="p-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-600">📁 Folders</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setIsCreatingRoot(true)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* All Notes Option */}
      <div 
        className={`flex items-center py-2 px-2 rounded-md cursor-pointer hover:bg-gray-50 mb-2 ${
          !showFavorites && selectedFolderId === null ? 'bg-blue-50 border-r-2 border-blue-500' : ''
        }`}
        onClick={() => {
          onFolderSelect(null);
          onShowFavoritesChange();
        }}
      >
        <div className="mr-2">
          <FolderOpen className="h-4 w-4 text-gray-500" />
        </div>
        <span className={`text-sm ${
          !showFavorites && selectedFolderId === null ? 'font-medium text-blue-700' : 'text-gray-700'
        }`}>
          All Notes
        </span>
      </div>

      {/* Create Root Folder Input */}
      {isCreatingRoot && (
        <div className="flex items-center py-1 px-2 mb-2">
          <FolderPlus className="h-4 w-4 text-gray-400 mr-2" />
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFolderName(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={() => {
              if (!newFolderName.trim()) {
                setIsCreatingRoot(false);
              }
            }}
            className="h-6 text-sm"
            autoFocus
          />
        </div>
      )}

      {/* Root Folders */}
      <div className="space-y-1">
        {rootFolders.map((folder: FolderWithChildren) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            level={0}
            selectedFolderId={selectedFolderId}
            onFolderSelect={onFolderSelect}
            onCreateFolder={onCreateFolder}
          />
        ))}
      </div>

      {rootFolders.length === 0 && !isCreatingRoot && (
        <div className="text-center py-8">
          <Folder className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-2">No folders yet</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsCreatingRoot(true)}
            className="text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create first folder
          </Button>
        </div>
      )}
    </div>
  );
}