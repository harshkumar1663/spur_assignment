/**
 * Error Handler Middleware
 * 
 * Converts domain errors to HTTP responses.
 * Never crashes - always returns valid response.
 */

import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ChatError, ChatErrorType } from '../services';
import { LLMError } from '../llm';

/**
 * Error response shape
 */
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number | undefined;
}

/**
 * Registers error handler with Fastify.
 * All errors are caught and converted to JSON responses.
 */
export function registerErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler(async (error: FastifyError | Error, _request: FastifyRequest, reply: FastifyReply) => {
    const logger = fastify.log;

    // Handle ChatError (domain errors from service layer)
    if (error instanceof ChatError) {
      logger.warn(
        {
          errorType: error.type,
          statusCode: error.statusCode,
          userMessage: error.userMessage,
        },
        'ChatError caught'
      );

      const response: ErrorResponse = {
        error: mapChatErrorToHTTPError(error.type),
        message: error.userMessage,
        statusCode: error.statusCode,
      };

      reply.code(error.statusCode).send(response);
      return;
    }

    // Handle LLMError (from LLM service) - shouldn't normally reach here
    if (error instanceof LLMError) {
      logger.error(
        {
          errorType: error.type,
          statusCode: error.statusCode,
        },
        'LLMError caught'
      );

      const response: ErrorResponse = {
        error: 'AI Service Error',
        message: error.userMessage,
        statusCode: error.statusCode,
      };

      reply.code(error.statusCode ?? 500).send(response);
      return;
    }

    // Handle Fastify validation errors (missing fields, wrong types)
    if ((error as any).statusCode === 400) {
      logger.warn({ validation: error.message }, 'Validation error');

      const response: ErrorResponse = {
        error: 'Invalid Request',
        message: 'Request validation failed. Check your input.',
        statusCode: 400,
      };

      reply.code(400).send(response);
      return;
    }

    // Handle other Fastify errors
    if ((error as any).statusCode) {
      logger.error(
        {
          statusCode: (error as any).statusCode,
          message: error.message,
        },
        'Fastify error'
      );

      const response: ErrorResponse = {
        error: error.name || 'Error',
        message: 'An error occurred processing your request.',
        statusCode: (error as any).statusCode,
      };

      reply.code((error as any).statusCode).send(response);
      return;
    }

    // Catch-all for unexpected errors
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Unexpected error'
    );

    const response: ErrorResponse = {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again later.',
      statusCode: 500,
    };

    reply.code(500).send(response);
  });
}

/**
 * Map ChatErrorType to HTTP error name
 */
function mapChatErrorToHTTPError(errorType: ChatErrorType): string {
  const errorMap: Record<ChatErrorType, string> = {
    [ChatErrorType.INVALID_INPUT]: 'Invalid Input',
    [ChatErrorType.CONVERSATION_NOT_FOUND]: 'Not Found',
    [ChatErrorType.AI_SERVICE_ERROR]: 'AI Service Error',
    [ChatErrorType.DATABASE_ERROR]: 'Server Error',
    [ChatErrorType.UNKNOWN_ERROR]: 'Unexpected Error',
  };

  return errorMap[errorType] || 'Error';
}
