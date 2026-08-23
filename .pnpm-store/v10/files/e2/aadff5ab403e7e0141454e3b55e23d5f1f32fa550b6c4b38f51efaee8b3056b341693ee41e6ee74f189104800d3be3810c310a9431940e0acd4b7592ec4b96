// Types

export function useFileDrop() {
  function getTransfer(e) {
    return e.dataTransfer ?? e.clipboardData ?? null;
  }
  function hasFilesOrFolders(e) {
    const transfer = getTransfer(e);
    const entries = [...(transfer?.items ?? [])].filter(x => x.kind === 'file').map(x => x.webkitGetAsEntry()).filter(Boolean);
    return entries.length > 0 || [...(transfer?.files ?? [])].length > 0;
  }
  async function handleDrop(e) {
    const transfer = getTransfer(e);
    const result = [];
    const entries = [...(transfer?.items ?? [])].filter(x => x.kind === 'file').map(x => x.webkitGetAsEntry()).filter(Boolean);
    if (entries.length) {
      for (const entry of entries) {
        const files = await traverseFileTree(entry, appendIfDirectory('.', entry));
        result.push(...files.map(x => x.file));
      }
    } else {
      result.push(...[...(transfer?.files ?? [])]);
    }
    return result;
  }
  return {
    handleDrop,
    hasFilesOrFolders
  };
}
function traverseFileTree(item, path = '') {
  return new Promise((resolve, reject) => {
    if (item.isFile) {
      const fileEntry = item;
      fileEntry.file(file => resolve([{
        file,
        path
      }]), reject);
    } else if (item.isDirectory) {
      const directoryReader = item.createReader();
      directoryReader.readEntries(async entries => {
        const files = [];
        for (const entry of entries) {
          files.push(...(await traverseFileTree(entry, appendIfDirectory(path, entry))));
        }
        resolve(files);
      });
    }
  });
}
function appendIfDirectory(path, item) {
  return item.isDirectory ? `${path}/${item.name}` : path;
}
//# sourceMappingURL=fileDrop.js.map