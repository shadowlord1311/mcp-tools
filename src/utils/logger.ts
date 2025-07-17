/**
 * Simple logging utility
 */
export class Logger {
  constructor(
    private level: 'debug' | 'info' | 'warn' | 'error' = 'info',
    private format: 'json' | 'text' = 'text'
  ) {}

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      this.log('info', message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      this.log('warn', message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      this.log('error', message, ...args);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    
    if (this.format === 'json') {
      const logEntry = {
        timestamp,
        level,
        message,
        ...(args.length > 0 && { data: args }),
      };
      console.log(JSON.stringify(logEntry));
    } else {
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      console.log(prefix, message, ...args);
    }
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();