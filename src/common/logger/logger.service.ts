// import {
//   Injectable,
//   LoggerService as NestLoggerService,
//   LogLevel,
// } from "@nestjs/common";
// import * as chalk from "chalk";

// @Injectable()
// export class LoggerService implements NestLoggerService {
//   logLevels: LogLevel[] = ["log", "error", "warn", "debug", "verbose"];

//   private formatContext(context?: string) {
//     return context ? chalk.cyan(`[${context}]`) : "";
//   }

//   log(message: string, context?: string) {
//     console.log(chalk.green("✅ LOG:"), this.formatContext(context), message);
//   }

//   error(message: string, trace?: string, context?: string) {
//     console.error(chalk.red("❌ ERROR:"), this.formatContext(context), message);
//     if (trace) console.error(chalk.gray(trace));
//   }

//   warn(message: string, context?: string) {
//     console.warn(
//       chalk.yellow("⚠️ WARN:"),
//       this.formatContext(context),
//       message
//     );
//   }

//   debug(message: string, context?: string) {
//     console.debug(
//       chalk.magenta("🛠️ DEBUG:"),
//       this.formatContext(context),
//       message
//     );
//   }

//   verbose(message: string, context?: string) {
//     console.debug(
//       chalk.blue("💬 VERBOSE:"),
//       this.formatContext(context),
//       message
//     );
//   }
// }
