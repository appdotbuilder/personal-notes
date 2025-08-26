import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schema types
import {
  createFolderInputSchema,
  updateFolderInputSchema,
  deleteFolderInputSchema,
  createTagInputSchema,
  updateTagInputSchema,
  deleteTagInputSchema,
  createNoteInputSchema,
  updateNoteInputSchema,
  deleteNoteInputSchema,
  searchNotesInputSchema,
  addTagToNoteInputSchema,
  removeTagFromNoteInputSchema
} from './schema';

// Import all handlers
import { createFolder } from './handlers/create_folder';
import { getFolders } from './handlers/get_folders';
import { updateFolder } from './handlers/update_folder';
import { deleteFolder } from './handlers/delete_folder';
import { createTag } from './handlers/create_tag';
import { getTags } from './handlers/get_tags';
import { updateTag } from './handlers/update_tag';
import { deleteTag } from './handlers/delete_tag';
import { createNote } from './handlers/create_note';
import { getNotes } from './handlers/get_notes';
import { getNoteById } from './handlers/get_note_by_id';
import { getNotesByFolder } from './handlers/get_notes_by_folder';
import { updateNote } from './handlers/update_note';
import { deleteNote } from './handlers/delete_note';
import { searchNotes } from './handlers/search_notes';
import { getFavoriteNotes } from './handlers/get_favorite_notes';
import { addTagToNote } from './handlers/add_tag_to_note';
import { removeTagFromNote } from './handlers/remove_tag_from_note';
import { getNotesByTag } from './handlers/get_notes_by_tag';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Folder management
  createFolder: publicProcedure
    .input(createFolderInputSchema)
    .mutation(({ input }) => createFolder(input)),

  getFolders: publicProcedure
    .query(() => getFolders()),

  updateFolder: publicProcedure
    .input(updateFolderInputSchema)
    .mutation(({ input }) => updateFolder(input)),

  deleteFolder: publicProcedure
    .input(deleteFolderInputSchema)
    .mutation(({ input }) => deleteFolder(input)),

  // Tag management
  createTag: publicProcedure
    .input(createTagInputSchema)
    .mutation(({ input }) => createTag(input)),

  getTags: publicProcedure
    .query(() => getTags()),

  updateTag: publicProcedure
    .input(updateTagInputSchema)
    .mutation(({ input }) => updateTag(input)),

  deleteTag: publicProcedure
    .input(deleteTagInputSchema)
    .mutation(({ input }) => deleteTag(input)),

  // Note management
  createNote: publicProcedure
    .input(createNoteInputSchema)
    .mutation(({ input }) => createNote(input)),

  getNotes: publicProcedure
    .query(() => getNotes()),

  getNoteById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getNoteById(input.id)),

  getNotesByFolder: publicProcedure
    .input(z.object({ folderId: z.number().nullable() }))
    .query(({ input }) => getNotesByFolder(input.folderId)),

  updateNote: publicProcedure
    .input(updateNoteInputSchema)
    .mutation(({ input }) => updateNote(input)),

  deleteNote: publicProcedure
    .input(deleteNoteInputSchema)
    .mutation(({ input }) => deleteNote(input)),

  searchNotes: publicProcedure
    .input(searchNotesInputSchema)
    .query(({ input }) => searchNotes(input)),

  getFavoriteNotes: publicProcedure
    .query(() => getFavoriteNotes()),

  // Note-Tag relationship management
  addTagToNote: publicProcedure
    .input(addTagToNoteInputSchema)
    .mutation(({ input }) => addTagToNote(input)),

  removeTagFromNote: publicProcedure
    .input(removeTagFromNoteInputSchema)
    .mutation(({ input }) => removeTagFromNote(input)),

  getNotesByTag: publicProcedure
    .input(z.object({ tagId: z.number() }))
    .query(({ input }) => getNotesByTag(input.tagId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();