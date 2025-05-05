-- DropIndex
DROP INDEX "Account_provider_providerAccountId_key";

-- DropIndex
DROP INDEX "Session_sessionToken_key";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "access_token",
DROP COLUMN "expires_at",
DROP COLUMN "id_token",
DROP COLUMN "provider",
DROP COLUMN "providerAccountId",
DROP COLUMN "refresh_token",
DROP COLUMN "refresh_token_expires_in",
DROP COLUMN "session_state",
DROP COLUMN "token_type",
ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "accessTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiresAt" INTEGER,
ADD COLUMN     "idToken" TEXT,
ADD COLUMN     "providerId" TEXT NOT NULL,
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "refreshTokenExpiresIn" INTEGER,
ADD COLUMN     "sessionState" TEXT,
ADD COLUMN     "tokenType" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'oauth';

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "expires",
DROP COLUMN "sessionToken",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ipAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "token" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userAgent" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerified",
ADD COLUMN     "emailVerified" JSONB;

-- DropTable
DROP TABLE "VerificationToken";

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "token" TEXT,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Verification_identifier_key" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

