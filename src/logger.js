const ospath = require("path");
const fs = require('fs');

let instance;

class Logger {
  constructor(options) {
    this.options;
    this.setOptions(options);
    this.fileIsCreated = false;
    if (instance) {
        throw new Error("You can only create one instance!");
    }
    instance = this;
  }

  setOptions(options) {
    this.options = options || { type: 'disabled' };
    if (this.options.type === 'file') {
        if (!this.options.filePath) {
            this.options.filePath = ospath.resolve("log.txt");
        }
        !this.fileIsCreated && fs.writeFileSync(this.options.filePath, "");
        this.fileIsCreated = true;
    }
  }

  getFormattedDate() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').slice(0, 19);
  }
  
  formatMessage(message) {
    return `${this.getFormattedDate()} - ${message}`;
  }

  log(message) {
    const formattedMessage = this.formatMessage(message);
    switch (this.options.type) {
      case 'screen':
        console.log(formattedMessage);
        break;
      case 'file':
        if (this.options.filePath) {
          fs.appendFileSync(this.options.filePath, formattedMessage + '\n');
        }
        break;
      case 'disabled':
      default:
        break;
    }
  }
}

const singletonLogger = new Logger();

module.exports = singletonLogger;