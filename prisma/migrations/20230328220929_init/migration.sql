-- CreateTable
CREATE TABLE "servers" (
    "id" TEXT NOT NULL,
    "victims" INTEGER[],

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sounds" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "uploader_id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,

    CONSTRAINT "sounds_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sounds" ADD CONSTRAINT "sounds_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
