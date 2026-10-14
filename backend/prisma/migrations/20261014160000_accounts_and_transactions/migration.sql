-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountSyncStatus" AS ENUM ('IDLE', 'RUNNING', 'ERROR');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "TransactionKind" AS ENUM ('STANDARD', 'REFUND', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'IMPORT', 'SYNC');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL DEFAULT 'CHECKING',
    "currency" VARCHAR(3) NOT NULL,
    "external_provider" TEXT,
    "external_account_id" TEXT,
    "last_synced_at" TIMESTAMPTZ,
    "sync_cursor" TEXT,
    "sync_status" "AccountSyncStatus" NOT NULL DEFAULT 'IDLE',
    "sync_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "date" DATE NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'POSTED',
    "kind" "TransactionKind" NOT NULL DEFAULT 'STANDARD',
    "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL',
    "memo" TEXT,
    "external_provider" TEXT,
    "external_id" TEXT,
    "related_transaction_id" UUID,
    "transfer_group_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_id_user_id_key" ON "accounts"("id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_user_external_account_key" ON "accounts"("user_id", "external_provider", "external_account_id") WHERE ("external_provider" IS NOT NULL AND "external_account_id" IS NOT NULL);

-- CreateIndex
CREATE INDEX "accounts_user_id_name_id_idx" ON "accounts"("user_id", "name", "id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_id_user_id_key" ON "transactions"("id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_account_external_id_key" ON "transactions"("account_id", "external_provider", "external_id") WHERE ("external_provider" IS NOT NULL AND "external_id" IS NOT NULL);

-- CreateIndex
CREATE INDEX "transactions_active_user_date_idx" ON "transactions"("user_id", "date" DESC, "id" DESC) WHERE ("deleted_at" IS NULL);

-- CreateIndex
CREATE INDEX "transactions_user_id_account_id_date_id_idx" ON "transactions"("user_id", "account_id", "date" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "transactions_account_id_status_idx" ON "transactions"("account_id", "status");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_user_id_fkey" FOREIGN KEY ("account_id", "user_id") REFERENCES "accounts"("id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_related_transaction_id_user_id_fkey" FOREIGN KEY ("related_transaction_id", "user_id") REFERENCES "transactions"("id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
