function nextMonth(expiry) {
  const date = new Date(expiry);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const monthEnd = new Date(date);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);
  date.setUTCDate(Math.min(day, monthEnd.getUTCDate()));
  return date;
}

export async function updateStudentAccess({
  databases, databaseId, schoolId, studentId, action, expectedExpiresAt, expiresAt,
  studentsCollectionId, codesCollectionId, invitesCollectionId, batchesCollectionId,
  timestamp = new Date().toISOString(),
}) {
  const { $id: transactionId } = await databases.createTransaction({ ttl: 60 });
  const document = (collectionId, documentId) => ({ databaseId, collectionId, documentId, transactionId });
  const read = (collectionId, documentId) => databases.getDocument(document(collectionId, documentId));
  const write = (collectionId, documentId, data) => databases.updateDocument({
    ...document(collectionId, documentId), data: { ...data, updatedAt: timestamp },
  });
  let committed = false;

  try {
    const student = await read(studentsCollectionId, studentId);
    if (student.schoolId !== schoolId) throw new Error('Student access denied');

    const revoking = action === 'revoke_student';
    if (revoking && student.status === 'revoked') return student;
    if (student.status !== 'active') throw new Error('Only active enrollments can be changed');

    const enrollmentUpdate = revoking ? { status: 'revoked' } : {};
    if (!revoking) {
      const current = Date.parse(student.expiresAt);
      const expected = Date.parse(expectedExpiresAt ?? student.expiresAt);
      if (!Number.isFinite(current) || !Number.isFinite(expected)) throw new Error('Invalid enrollment expiration');
      const next = nextMonth(expected);

      if (expectedExpiresAt == null && Date.parse(expiresAt) === current) return student;
      if (expectedExpiresAt == null && Date.parse(expiresAt) !== next.getTime()) {
        throw new Error('Extend access by one month from the current expiration');
      }
      if (current === next.getTime()) return student;
      if (current !== expected) throw Object.assign(new Error('Enrollment changed'), { code: 409 });
      if (next.getTime() <= Date.parse(timestamp)) throw new Error('This enrollment has expired');
      enrollmentUpdate.expiresAt = next.toISOString();
    }

    const updated = await write(studentsCollectionId, studentId, enrollmentUpdate);

    if (student.inviteId) {
      const invite = await read(invitesCollectionId, student.inviteId);
      if (invite.schoolId !== schoolId || !student.batchId || invite.batchId !== student.batchId ||
          invite.claimedByUserId !== student.userId || invite.status !== 'claimed') {
        throw new Error('Enrollment invite does not match the student');
      }
      await write(invitesCollectionId, student.inviteId, revoking
        ? { status: 'revoked' }
        : { expiresAt: enrollmentUpdate.expiresAt });
    }

    if (revoking) {
      const seatCollectionId = student.inviteId ? batchesCollectionId : codesCollectionId;
      const seatId = student.inviteId ? student.batchId : student.codeId;
      const seat = await read(seatCollectionId, seatId);
      if (seat.schoolId !== schoolId) throw new Error('Enrollment seat does not belong to this school');
      if (!Number.isInteger(seat.seatsUsed) || seat.seatsUsed < 0) throw new Error('Invalid enrollment seat count');

      const seatsUsed = Math.max(0, seat.seatsUsed - 1);
      const seatUpdate = { seatsUsed };
      if (!student.inviteId && seat.status === 'depleted' && seatsUsed < seat.seatsPurchased) {
        seatUpdate.status = Date.parse(seat.expirationDate) > Date.parse(timestamp) ? 'active' : 'expired';
      }
      await write(seatCollectionId, seatId, seatUpdate);
    }

    await databases.updateTransaction({ transactionId, commit: true });
    committed = true;
    return updated;
  } finally {
    if (!committed) await databases.updateTransaction({ transactionId, rollback: true }).catch(() => {});
  }
}
