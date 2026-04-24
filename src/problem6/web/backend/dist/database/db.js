import knex from "knex";
let instance = null;
function connectionConfig() {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
        throw new Error("DATABASE_URL is not set or empty");
    }
    if (url.includes("sslmode=disable") || /localhost|127\.0\.0\.1/.test(url)) {
        return { connectionString: url, ssl: false };
    }
    return url;
}
export function getKnex() {
    if (!instance) {
        instance = knex({
            client: "pg",
            connection: connectionConfig(),
            pool: { min: 0, max: 10 },
        });
    }
    return instance;
}
export async function destroyKnex() {
    if (instance) {
        await instance.destroy();
        instance = null;
    }
}
//# sourceMappingURL=db.js.map