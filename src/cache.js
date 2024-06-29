const fs = require("fs");
const ospath = require("path");
const PathFunctions = require("./path");

class Cache {
    constructor(cacheFileName, cacheFolderName, cacheMetadataFileName, cacheMetadataKey, cacheMetadataValue, loadCacheStrategy) {
      this.data;
      this.cacheFileName = cacheFileName;
      this.cacheFolderPath = ospath.resolve(cacheFolderName);
      this.cacheMetadataFilePath = ospath.resolve(this.cacheFolderPath, cacheMetadataFileName);
      this.cacheMetadataKey = cacheMetadataKey;
      this.cacheMetadataValue = cacheMetadataValue;
      this.cacheMetadata = {};
      this.loadCacheStrategy = loadCacheStrategy;
      this.loadCacheMetadata();
    }

    get isCacheUpdated() {
        if (!this.cacheMetadataKey) return false;
        return this.cacheMetadata[this.cacheMetadataKey] === this.cacheMetadataValue;
    }

    saveCacheMetadata() {
        fs.writeFileSync(this.cacheMetadataFilePath, JSON.stringify(this.cacheMetadata, null, 2));
    }  

    loadCacheMetadata() {
        if (fs.existsSync(this.cacheMetadataFilePath)) {
            const cacheContent = fs.readFileSync(this.cacheMetadataFilePath);
            const cacheData = JSON.parse(cacheContent);
            this.cacheMetadata = cacheData;
        }
    }

    mapToObject(mapInstance) {
        return Object.fromEntries(mapInstance);
    }  

    saveCache(data) {
      const obj = (data instanceof Map) ? this.mapToObject(data) : data;
      const cacheFolderFilePath = ospath.resolve(this.cacheFolderPath, this.cacheFileName)
      PathFunctions.createFolderIfNotExists(this.cacheFolderPath);
      fs.writeFileSync(cacheFolderFilePath, JSON.stringify(obj, null, 2));
      this.data = data;
      if (!this.cacheMetadataKey) return;
      this.cacheMetadata[this.cacheMetadataKey] = this.cacheMetadataValue;
      this.saveCacheMetadata();
    }

    customizedParsingMethod(cacheData) {
        if (!this?.loadCacheStrategy) return cacheData;
        return this.loadCacheStrategy.customizedParsingMethod(cacheData);
    }
    
    loadCacheData() {
        const cacheFilePath = ospath.resolve(this.cacheFolderPath, this.cacheFileName);
        if (fs.existsSync(cacheFilePath)) {
            const cacheContent = fs.readFileSync(cacheFilePath);
            const cacheData = this.customizedParsingMethod(JSON.parse(cacheContent));
            this.data = cacheData;
        }
    }
  }
  
  module.exports = Cache;