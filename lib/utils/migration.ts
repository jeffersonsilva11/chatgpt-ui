import { Conversation } from '@/lib/types';

/**
 * Migrate conversations from localStorage to database
 */
export async function migrateConversationsToDatabase(token: string): Promise<{
  migrated: number;
  failed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migrated = 0;
  let failed = 0;

  try {
    // Get conversations from localStorage
    const conversationsJson = localStorage.getItem('conversations');
    if (!conversationsJson) {
      return { migrated: 0, failed: 0, errors: [] };
    }

    const conversations: Conversation[] = JSON.parse(conversationsJson);

    if (!Array.isArray(conversations) || conversations.length === 0) {
      return { migrated: 0, failed: 0, errors: [] };
    }

    // Migrate each conversation
    for (const conversation of conversations) {
      try {
        // Create conversation in database
        const createResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: conversation.title,
            workflowId: conversation.workflowId,
          }),
        });

        if (!createResponse.ok) {
          const error = await createResponse.json();
          errors.push(`Failed to create conversation "${conversation.title}": ${error.error}`);
          failed++;
          continue;
        }

        const { conversation: newConversation } = await createResponse.json();

        // Add messages to conversation
        for (const message of conversation.messages) {
          try {
            const messageResponse = await fetch(
              `/api/conversations/${newConversation.id}/messages`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  role: message.role,
                  content: message.content,
                }),
              }
            );

            if (!messageResponse.ok) {
              const error = await messageResponse.json();
              errors.push(
                `Failed to add message to "${conversation.title}": ${error.error}`
              );
            }
          } catch (err) {
            errors.push(
              `Error adding message to "${conversation.title}": ${
                err instanceof Error ? err.message : 'Unknown error'
              }`
            );
          }
        }

        migrated++;
      } catch (err) {
        errors.push(
          `Error migrating conversation "${conversation.title}": ${
            err instanceof Error ? err.message : 'Unknown error'
          }`
        );
        failed++;
      }
    }

    // Clear localStorage after successful migration
    if (migrated > 0 && failed === 0) {
      localStorage.removeItem('conversations');
      localStorage.removeItem('currentConversationId');
    }

    return { migrated, failed, errors };
  } catch (error) {
    return {
      migrated,
      failed,
      errors: [
        ...errors,
        `Migration error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
    };
  }
}

/**
 * Check if user has conversations in localStorage
 */
export function hasLocalStorageConversations(): boolean {
  if (typeof window === 'undefined') return false;

  const conversationsJson = localStorage.getItem('conversations');
  if (!conversationsJson) return false;

  try {
    const conversations = JSON.parse(conversationsJson);
    return Array.isArray(conversations) && conversations.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get count of conversations in localStorage
 */
export function getLocalStorageConversationCount(): number {
  if (typeof window === 'undefined') return 0;

  const conversationsJson = localStorage.getItem('conversations');
  if (!conversationsJson) return 0;

  try {
    const conversations = JSON.parse(conversationsJson);
    return Array.isArray(conversations) ? conversations.length : 0;
  } catch {
    return 0;
  }
}
