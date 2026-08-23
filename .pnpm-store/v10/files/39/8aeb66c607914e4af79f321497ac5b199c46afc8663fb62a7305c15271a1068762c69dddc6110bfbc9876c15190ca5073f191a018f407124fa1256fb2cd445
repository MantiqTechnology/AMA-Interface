let nextId = 0;
const fileIds = new WeakMap();
export function getFileKey(file) {
  let id = fileIds.get(file);
  if (id == null) {
    id = ++nextId;
    fileIds.set(file, id);
  }
  return id;
}
//# sourceMappingURL=fileKey.js.map