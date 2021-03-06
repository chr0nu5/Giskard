var EventEmitter = require('events'),
    Path = require('path'),
    fs = require('fs'),
    Singleton = require('./utils/singleton'),
    pkg = require('../package.json'),
    commander = require('commander');

var Bot = function() {
    [
    ``,
    `                                                                              `,`  ,ad8888ba,   88             88                                          88  `,
    ` d8"'    \`"8b  ""             88                                          88  `,`d8'                           88                                          88  `,
    `88             88  ,adPPYba,  88   ,d8   ,adPPYYba,  8b,dPPYba,   ,adPPYb,88  `,`88      88888  88  I8[    ""  88 ,a8"    ""     \`Y8  88P'   "Y8  a8"    \`Y88  `,`Y8,        88  88   \`"Y8ba,   8888[      ,adPPPPP88  88          8b       88  `,
    ` Y8a.    .a88  88  aa    ]8I  88\`"Yba,   88,    ,88  88          "8a,   ,d88  `,`  \`"Y88888P"   88  \`"YbbdP"'  88   \`Y8a  \`"8bbdP"Y8  88           \`"8bbdP"Y8  `,
    ``, ``
    ].forEach(i => console.log(i));
    this.events = new EventEmitter();
    this.logger = require('./utils/logger')('Bot', true);
    this.logger.info(`Giskard version ${pkg.version}`);
    return this;
};

Bot.prototype = {
    bootstrap: function(program) {
        this.settings = require('./models/settings').sharedInstance();
        this.name = 'bot';
        this.mentionMarks = [];
        var InputManager = require('./managers/input_manager'),
            ModuleManager = require('./managers/module_manager'),
            InstallationManager = require('./managers/installation_manager'),
            ContextManager = require('./managers/context_manager'),
            ApiManager = require('./managers/api_manager'),
            Sentry = require('./utils/sentry');

        Sentry.sharedInstance().setup();
        this.moduleManager = new ModuleManager();
        this.installationManager = new InstallationManager();
        this.inputManager = new InputManager();
        this.contextManager = new ContextManager();
        this.apiManager = new ApiManager();
        this.logger.info('Initialising database connection...');
        this.db = require('./utils/db');
        this.db.prepare()
            .then(() => {
                 this.setupAdapter()
                    .then(() => {
                        this.contextManager.cleanUp();
                        this.apiManager.startServer();
                        this.moduleManager
                            .loadModules()
                            .then(() => {
                                if(program.installDeps || (Object.keys(this.moduleManager.modules).length < 1 && process.env.GISK_ENV === 'prod')) {
                                    this.logger.info('Respecting install-deps flag or prefilling modules on production environment...');
                                    return this.installationManager.install('giskard-bot/module-manager');
                                } else {
                                    return Promise.resolve();
                                }
                            })
                            .catch(ex => {
                                this.logger.error('Error installing dependencies through install-deps:');
                                this.logger.error(ex);
                                this.logger.warning('Resuming boot...');
                                return Promise.resolve();
                            })
                            .then(() => this.logger.info('Dispatching "run" command to Adapter...'))
                            .then(() => this.adapter.run());
                    })
                    .catch((ex) => {
                        this.logger.error('Adapter setup failed. Aborting.');
                        this.logger.error(ex);
                        process.exit(1);
                    });
            })
            .catch(ex => {
                this.logger.error('Error initialising database:');
                this.logger.error(ex);
                process.exit(1);
            });
        process.on('uncaughtException', ex => {
            this.logger.error('Uncaught exception: ');
            this.logger.error(ex);
            Sentry.sharedInstance().recordEvent(ex);
        });
    },
    setupAdapter: function() {
        var adapterName = this.settings.adapter;
        this.logger.info(`Loading adapter: ${adapterName}...`);
        var AdapterManager = require('./managers/adapter_manager'),
            am = new AdapterManager(),
            availableAdapters = am.getAdapters();
        if(!availableAdapters.some(a => a.toLowerCase() === adapterName.toLowerCase())) {
            this.logger.error(`Adapter not found: ${adapterName}.`);
            process.exit(1);
        } else {
            return am.loadAdapter(adapterName)
                .then((Klass) => { return (this.adapter = new Klass(this)); }) // jshint ignore:line
                .then((adp) => adp.setup())
                .catch(ex => {
                    this.logger.error('Error initialising adapter: ');
                    this.logger.error(ex);
                    process.exit(1);
                });
        }
    }
};

module.exports = new Singleton(Bot);
