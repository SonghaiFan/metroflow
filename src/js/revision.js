import paper from "paper";
import { saveMap, loadMap } from "./serialize";

const MAX_REVISIONS = 100;
let revisions = [];
let currentRevision = -1;

export function createRevision(map) {
  console.log("createRevision");
  currentRevision++;
  const mapDataString = saveMap(map);
  if (currentRevision >= revisions.length) {
    revisions.push(mapDataString);
  } else {
    revisions[currentRevision] = mapDataString;
    revisions.splice(
      currentRevision + 1,
      revisions.length - currentRevision - 1
    );
  }
  while (revisions.length > MAX_REVISIONS) {
    revisions.shift();
    currentRevision--;
  }
  console.log("currentRevision", currentRevision);
}

export function undo(map) {
  if (currentRevision <= 0) {
    return map;
  }
  currentRevision--;
  const last = revisions[currentRevision];
  return loadMap(JSON.parse(last));
}

export function redo(map) {
  if (currentRevision + 1 >= revisions.length) {
    return map;
  }
  currentRevision++;
  const next = revisions[currentRevision];
  return loadMap(JSON.parse(next));
}

export function hasUndo() {
  return currentRevision > 0;
}

export function hasRedo() {
  return currentRevision + 1 < revisions.length;
}

export function clearRevisions() {
  revisions = [];
  currentRevision = -1;
}
