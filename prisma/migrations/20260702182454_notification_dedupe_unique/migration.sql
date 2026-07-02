-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_type_entityType_entityId_key" ON "Notification"("userId", "type", "entityType", "entityId");
