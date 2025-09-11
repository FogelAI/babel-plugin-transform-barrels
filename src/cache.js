const { PathFunctions } = require('./utils');
const { BuildInFileSystem: FileSystem, SerializedFile } = require('./buildInFileSystem');
const { JsonSerializer } = require('./serializers');

class CachePathResolver {
  constructor(path) {
    this.path = path;
  }

  getCacheFilePath(cacheFileName, cacheFolderName) {
    const cacheFolderPath = this.path.getFolderPath(cacheFolderName);
    return this.path.getFilePath(cacheFolderPath, cacheFileName);
  }
}

class CachePackagePathResolver extends CachePathResolver {
  #getCachePackageFileName(packageName) {
    if (PathFunctions.isNodeModule(packageName)) {
      return `${packageName}.json`.replace("\\","_");
    } else {
      return `local.json`;
    }
  }

  getCachePackageFilePath(packageName, cacheFolderName) {
    const cachePackageFileName = this.#getCachePackageFileName(packageName);
    return this.getCacheFilePath(cachePackageFileName, cacheFolderName);
  }
}

class PackageCache {
  constructor(packageName, cacheFolderName, serializedFile) {
    this.packageName = packageName;
    this.cacheFolderName = cacheFolderName;
    this.pathResolver = new CachePackagePathResolver(PathFunctions);
    this.serializedFile = serializedFile;
  }

  get cacheFilePath() {
    return this.pathResolver.getCachePackageFilePath(this.packageName, this.cacheFolderName);
  }

  isCacheUpdated(currentPackageVersion) {
    return FileCacheFactory.cachedPackagesVersions.isCacheUpdated(this.packageName, currentPackageVersion);
  }

  readCache() {
    const cacheData = this.serializedFile.read(this.cacheFilePath);
    return cacheData;
  }

  saveCache(data, currentPackageVersion, saveInAdditionCachedPackagesVersions = true) {
    this.serializedFile.save(this.cacheFilePath, data);
    FileCacheFactory.cachedPackagesVersions.setPackageVersion(this.packageName, currentPackageVersion);
    if (saveInAdditionCachedPackagesVersions) {
      FileCacheFactory.cachedPackagesVersions.saveCache();
    }
  }
}

class CachedPackagesVersions {
  static cached;

  constructor(cacheFileName, cacheFolderName, serializedFile) {
    this.cacheFileName = cacheFileName;
    this.cacheFolderName = cacheFolderName;
    this.pathResolver = new CachePathResolver(PathFunctions);
    this.serializedFile = serializedFile;
    this.packagesVersions = {};
  }

  get cacheFilePath() {
    return this.pathResolver.getCacheFilePath(this.cacheFileName, this.cacheFolderName);
  }

  getPackageVersion(packageName) {
    return this.packagesVersions[packageName];
  }

  setPackageVersion(packageName, newPackageVersion) {
    this.packagesVersions[packageName] = newPackageVersion;
  }

  isCacheUpdated(packageName, currentPackageVersion) {
    return this.getPackageVersion(packageName) === currentPackageVersion;
  }

  readCache() {
    const cacheData = this.serializedFile.read(this.cacheFilePath);
    return cacheData;
  }

  saveCache() {
    this.serializedFile.save(this.cacheFilePath, this.packagesVersions);
  }

  load() {
    if (!CachedPackagesVersions.cached) {
      this.packagesVersions = this.readCache() || {};
      CachedPackagesVersions.cached = this.packagesVersions;
    } else {
      this.packagesVersions = CachedPackagesVersions.cached;
    }
  }
}

class FileCacheFactory {
  static cachedPackagesVersions;

  static #createSerializedFile(serializer) {
    const fileSystem = new FileSystem(PathFunctions);
    const serializedFile = new SerializedFile(fileSystem, serializer);
    return serializedFile;
  }

  static createPackageCache(packageName, cacheFolderName, serializer) {
    if (!FileCacheFactory.cachedPackagesVersions) {
      const packagesVersionsFileName = "packagesVersions.json";
      FileCacheFactory.cachedPackagesVersions = FileCacheFactory.#createPackageVersionManager(packagesVersionsFileName, cacheFolderName);
    }
    const serializedFile = FileCacheFactory.#createSerializedFile(serializer)
    const packageCache = new PackageCache(packageName, cacheFolderName, serializedFile);
    return packageCache;
  }

  static #createPackageVersionManager(cacheFileName, cacheFolderName) {
    const serializedFile = FileCacheFactory.#createSerializedFile(new JsonSerializer());
    const serializedCachePackagesVersions = new CachedPackagesVersions(cacheFileName, cacheFolderName, serializedFile);
    serializedCachePackagesVersions.load()
    return serializedCachePackagesVersions;
  }
}

module.exports = { FileCacheFactory };