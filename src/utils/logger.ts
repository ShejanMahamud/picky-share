/**
 * Logging utility for Picky Share
 * Provides structured logging with different levels
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private context: string;

  constructor(context: string = "PickyShare") {
    this.context = context;
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private addLog(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      context: this.context,
      message,
      data,
    };

    this.logs.push(entry);

    // Keep logs size reasonable
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  debug(message: string, data?: any): void {
    this.addLog("debug", message, data);
    // In development, log debug messages
    if (typeof chrome !== "undefined" && chrome.runtime) {
      console.debug(`[${this.context}] ${message}`, data);
    }
  }

  info(message: string, data?: any): void {
    this.addLog("info", message, data);
    console.info(`[${this.context}] ${message}`, data);
  }

  warn(message: string, data?: any): void {
    this.addLog("warn", message, data);
    console.warn(`[${this.context}] ${message}`, data);
  }

  error(message: string, error?: Error | any): void {
    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error;

    this.addLog("error", message, errorData);
    console.error(`[${this.context}] ${message}`, errorData);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instances for different contexts
export const loggerBackground = new Logger("Background");
export const loggerContent = new Logger("Content");
export const loggerPopup = new Logger("Popup");
export const loggerApi = new Logger("API");

export default Logger;
