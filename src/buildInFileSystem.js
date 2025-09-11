const fs = require("fs");

class BuildInFileSystem {
    constructor(path) {
        this.path = path;
    }

    pathExists(path) {
        try {
            return !fs.accessSync(path, fs.constants.F_OK);
        } catch (e) {
            return false;
        }
    }  

    folderExists(path) {
        return (fs.existsSync(path) && fs.lstatSync(path).isDirectory());
    }  

    createFolderIfNotExists(folderPath) {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }
    }

    fileExists(path) {
        try {
            return (this.pathExists(path) && fs.lstatSync(path).isFile());
        } catch (e) {
            return false;
        }
    }

    readFile(filePath, encoding=null) {
        if (this.fileExists(filePath)) {
            return fs.readFileSync(filePath, encoding);
        }
        return null;
    }
    
    writeFile(filePath, raw) {
        const folderPath = this.path.dirName(filePath);
        this.createFolderIfNotExists(folderPath);
        fs.writeFileSync(filePath, raw);
    }
}

class SerializedFile {
    constructor(fileSystem, serializer) {
        this.fileSystem = fileSystem;
        this.serializer = serializer;
    }

    read(path) {
        const fileRaw = this.fileSystem.readFile(path);
        if (!fileRaw) return null;
        const fileData = this.serializer.deserialize(fileRaw);
        return fileData;    
    }

    save(path, data) {
        const raw = this.serializer.serialize(data);
        this.fileSystem.writeFile(path, raw);
    }    
}

module.exports = { BuildInFileSystem, SerializedFile };