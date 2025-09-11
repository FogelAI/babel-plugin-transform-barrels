class JsonSerializer {
    serialize(data) {
      const raw = JSON.stringify(data, null, 2);
      return raw;
    }
  
    deserialize(raw) {
      const data = JSON.parse(raw);
      return data;
    }
}

module.exports = { JsonSerializer };