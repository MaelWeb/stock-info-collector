import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare const closePrismaConnection: () => Promise<void>;
export declare const checkDatabaseHealth: () => Promise<boolean>;
export declare const withTransaction: <T>(fn: (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => Promise<T>) => Promise<T>;
export declare const getPrismaConfig: () => {
    datasources: {
        db: {
            url: string | undefined;
        };
    };
    connection: {
        pool: {
            min: number;
            max: number;
        };
    };
};
//# sourceMappingURL=prisma.d.ts.map