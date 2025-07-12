"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrismaConfig = exports.withTransaction = exports.checkDatabaseHealth = exports.closePrismaConnection = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
if (process.env['NODE_ENV'] !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
const closePrismaConnection = async () => {
    try {
        await exports.prisma.$disconnect();
        console.log('Prisma connection closed successfully');
    }
    catch (error) {
        console.error('Error closing Prisma connection:', error);
        throw error;
    }
};
exports.closePrismaConnection = closePrismaConnection;
const checkDatabaseHealth = async () => {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
};
exports.checkDatabaseHealth = checkDatabaseHealth;
const withTransaction = async (fn) => {
    return await exports.prisma.$transaction(fn);
};
exports.withTransaction = withTransaction;
const getPrismaConfig = () => ({
    datasources: {
        db: {
            url: process.env['DATABASE_URL'],
        },
    },
    connection: {
        pool: {
            min: 2,
            max: 10,
        },
    },
});
exports.getPrismaConfig = getPrismaConfig;
//# sourceMappingURL=prisma.js.map