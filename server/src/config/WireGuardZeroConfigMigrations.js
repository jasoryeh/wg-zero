const debug = require('debug')('wgeasy:Migrations');
const { WG_MIGRATION_SAVE } = require('../../config');
const { WireGuardConfig } = require('../WireGuardConfig');
const { WireGuardInterface, WireGuardPeer } = require('./WireGuardModels');
const fs = require('fs');
const path = require('path');

const MIGRATION_FOLDER = 'migrations';

class WireGuardZeroConfigMigrations {
    static assertMigrationHasPerform(name, requiredModule) {
        if (!('Perform' in requiredModule)) {
            throw new Error(`Migration ${name} did not have a 'Perform'!`);
        }
        return requiredModule;
    }
    
    static getAvailableMigrations() {
        let migrationsDir = path.join(__dirname, MIGRATION_FOLDER);
        let migrationFiles = fs.readdirSync(migrationsDir);
        let migrations = migrationFiles.filter((file) => file.endsWith('.js'))
            .map((file) => file.slice(0, file.length - 3))
            .sort();
        debug(`Detected ${migrations.length} total migrations!`);
        return migrations.map((migration) => {
            //debug(`\t -> ${migration}`);
            let requiredModule = this.assertMigrationHasPerform(migration, require(`./${MIGRATION_FOLDER}/${migration}`));
            try {
                return {
                    name: migration, 
                    migration: requiredModule,
                };
            } catch(err) {
                debug(`Failed to import migration ${migration}!`);
                debug(err);
                throw err;
            }
        });
    }
    
    /**
     * 
     * @param {WireGuardConfig} WireGuardConfig 
     */
    static async execute(WireGuardConfig) {
        let migrations = this.getAvailableMigrations();

        if (WG_MIGRATION_SAVE) {
            WireGuardConfig.backupFSCopy();
        }
    
        let wgInterface = WireGuardConfig.getInterface();
        let peers = WireGuardConfig.getPeers();
    
        let lastMigration = wgInterface.getConfigVersion();
        debug(`Total Migrations: ${migrations.length}`);
        debug(`Last migration version: ${lastMigration == 0 ? 'Unmanaged' : lastMigration}`);
        try {
            let migrationsRun = 0;
            for (let i = lastMigration; i < migrations.length; i++) {
                migrationsRun++;
                let {name, migration} = migrations[i];
                debug(`Executing migration #${i} - ${name}...`);
                await migration.Perform.call(this, require('debug')('wgeasy:Migrations:Migration:' + name), wgInterface, peers);
            }
            debug(migrationsRun <= 0 ? 'No migrations were run' : `Migrations ran: ${migrationsRun}`)
            debug('Migrations complete.'); // complete, but keep in memory for now.
            wgInterface.setConfigVersion(migrations.length);

            if (WG_MIGRATION_SAVE) { // default is to migrate in-memory for now
                WireGuardConfig.save();
            }
        } catch(err) {
            debug('Migrations failed with an error! The configuration was not modified.');
            debug(err);

            if (WG_MIGRATION_SAVE) {
                debug("Reverting to backup...")
                WireGuardConfig.revert();
            }
            throw err;
        }
    }
}

module.exports.WireGuardZeroConfigMigrations = WireGuardZeroConfigMigrations;