// Dialogue deliberately never locks walking. Only transactional UI and delivery do.
export function movementDirection(pressed, held) {
    return Number(pressed.has('arrowright') || pressed.has('d') || held.has(1))
        - Number(pressed.has('arrowleft') || pressed.has('a') || held.has(-1));
}

export function canWalk({shopOpen = false, notebookOpen = false, endingOpen = false, busy = false, finished = false}) {
    return !shopOpen && !notebookOpen && !endingOpen && !busy && !finished;
}
