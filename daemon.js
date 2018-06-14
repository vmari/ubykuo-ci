#!/usr/bin/env node

var PACKAGE_NAME = 'ubykuo-ci';
var DATA_DIR = './data';
var LOG_DIR = './logs';
var CONFIG_DIR = './conf';

var fs = require('fs'),
  childprocess = require('child_process'),
  winston = require('winston'),
  validate = require('jsonschema').validate,
  dotenv = require('dotenv');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(function (info) {
      console.log(info);
      return info.timestamp + ' [' + info.level + ']: ' + info.message;
    })),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: LOG_DIR + '/daemon.log',
      timestamp: true
    })
  ]
});

try {
  var config = JSON.parse(fs.readFileSync(CONFIG_DIR + '/config.json')),
    configSchema = JSON.parse(fs.readFileSync(__dirname + '/configJsonSchema.json'));

  validate(config, configSchema, {throwError: true});
} catch (err) {
  logger.info(err);
  logger.info("Invalid config file");
  throw new Error("Invalid config file");
}


if (fs.existsSync(DATA_DIR + '/.ssh/id_rsa')) {
  logger.info('Key exists')
} else {
  logger.info('Generating key...');
  childprocess.exec("cd " + DATA_DIR + " && mkdir -p .ssh && ssh-keygen -f .ssh/id_rsa -t rsa -N ''", function (err, stdout, stderr) {
    if (err) {
      logger.info('Error creating key');
    } else {
      logger.info('Key generated');
    }
  });
}

var http = require('http'),
  https = require('https'),
  pem = require('pem'),
  GitUrlParse = require("git-url-parse"),
  q = require('queue')(),
  request = require('request');

q.timeout = 30 * 60 * 1000; // media hora
q.concurrency = 1; // no mas de un build a la vez
q.autostart = true; // arranca ni bien puedas maestro

q.on('timeout', function (next, job) {
  //logger.info('Build is taking too long:', job.key);
});

q.on('success', function (result, job) {
  //logger.info('Build finished:', job.key);
});

//Run first build if it's necessary
for (var i = 0, len = config.projects.length; i < len; i++) {
  updateRepository(config.projects[i]);
}

//Listen server
if (config.ssl) {
  pem.createCertificate(function (err, keys) {
    if (err) {
      logger.info(err);
    }
    https.createServer({key: keys.serviceKey, cert: keys.certificate}, handleRequest).listen(config.port);
  });
} else {
  http.createServer(handleRequest).listen(config.port);
}

function handleRequest(request, response) {
  var queryData = "";

  if (request.url === config.webhook.path) {
    if (request.method === config.webhook.method) {

      request.on('data', function (data) {
        queryData += data;
        if (queryData.length > 1e6) {
          queryData = "";
          response.writeHead(413, {'Content-Type': 'text/plain'});
          response.end();
          request.connection.destroy();
        }
      });

      request.on('end', function () {
          try {
            data = JSON.parse(queryData);
            logger.info('Success request');
            response.writeHead(200);
            response.write('ok');
            response.end();

            var projects = detectProject(request, data);
            if (projects.length === 0) {
              logger.info('Project not found');
            }
            projects.forEach(function (pr) {
              updateRepository(pr);
            });
          } catch (e) {
            response.writeHead(400);
            response.write('Malformed JSON');
            response.end();
          }
        }
      );
    } else {
      response.writeHead(405);
      response.end();
    }
  } else {
    response.writeHead(404);
    response.end();
  }
}

/**
 * Returns the destination branch of the push/merge
 */
function detectProject(request, data) {
  /**
   * Bitbucket events
   *  Header: X-Event-Key
   *    pullrequest:fulfilled (always pull & build or build if branch = pullrequest.destination.branch)
   *    repo:push (always pull & build)
   *
   * Detect repository
   *  repository.full_name = team_name/repo_name
   *
   * Whitelist:
   *  104.192.136.0/21
   *  34.198.203.127
   *  34.198.178.64
   *  34.198.32.85
   *  -
   *  2401:1d80:1010::/64
   *  2401:1d80:1003::/64
   */

  /**
   * Github events
   *  Header X-GitHub-Event
   *    push
   *    pull_request
   *
   * Detect repository
   *  repository.full_name = team_name/repo_name
   *
   * Whitelist:
   *  192.30.252.0/22
   *  185.199.108.0/22
   */
  return findProjects(data.repository.full_name);
}

/**
 * Locate project root with config files
 */
function findProjects(full_name) {
  var projects = [];
  for (var i = 0, len = config.projects.length; i < len; i++) {
    var project = config.projects[i],
      data = GitUrlParse(project.repo.url);

    var name = data.owner + '/' + data.name;
    logger.info(name, full_name);
    if (name === full_name) {
      projects.push(project);
    }
  }
  return projects;
}

/**
 *
 */
function configRepository(project) {
  var path = getProjectPath(project);

  if (fs.existsSync(path + '/.git')) {
    logger.info('Project is initialized');
    return;
  }
  logger.info('Project need initialization');
  childprocess.execSync("mkdir -p '" + path + "'");
  childprocess.execSync("cd '" + path + "' " +
    " && GIT_SSH_COMMAND='ssh -i ../.ssh/id_rsa -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no' git clone " + project.repo.url + ' . ' +
    " && git config core.sshCommand 'ssh -i " + DATA_DIR + "/.ssh/id_rsa -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no'" +
    " && git checkout " + project.repo.branch);
}

function getProjectPath(project) {
  var path;
  if (project.hasOwnProperty('path')) {
    path = project.path;
  } else {
    path = DATA_DIR + '/workspaces/' + project.key;
  }
  return path;
}

/**
 * Updates the source files from the configured repository.
 */
function updateRepository(project) {
  logger.info('Checking if update is needed in project: ' + project.key);
  configRepository(project);
  var path = getProjectPath(project);
  childprocess.exec("cd '" + path + "' && GIT_SSH_COMMAND='ssh -i " + DATA_DIR + "/.ssh/id_rsa -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no' git fetch", function (err, stdout, stderr) {
if (err) { console.log('Error updating project', err, stdout, stderr); return;}
    logger.info(__dirname);
    childprocess.exec("cd '" + path + "' && /bin/sh -xe '" + __dirname + "/scripts/checkUpdate.sh'", function (ccc) {
      logger.info('Exit code of check wass ' + ccc);
      if (ccc === null) {
        logger.info('Project is up-to-date');
      } else if (ccc.code === 1) {
        logger.info('Updating repository');
        childprocess.exec("cd '" + path + "' " +
          " && GIT_SSH_COMMAND='ssh -i " + DATA_DIR + "/.ssh/id_rsa -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no' git pull origin " + project.repo.branch, function (err, stdout, stderr) {
          if (err) {
            console.log('Error updating project', err, stdout, stderr);
          } else {
            logger.info(stdout);
            buildProject(project);
          }
        });
      } else {
        sendNotification(project, "Error checking repo");
      }
    });
  });
}

var timeCounters = {};

function timeStart() {
  var time = new Date().getTime();
  var key = Math.random().toString();
  timeCounters[key] = time;
  return key;
}

function timeEnd(key) {
  var time = new Date().getTime();
  var timeCounter = timeCounters[key];
  if (timeCounter) {
    var diff = time - timeCounter;
    delete timeCounters[key];
    return diff;
  } else {
    return -1;
  }
}

function sendNotification(project, message) {
  var slackConfig;
  if (project.hasOwnProperty('slack')) {
    slackConfig = project.slack;
  } else if (config.hasOwnProperty('slack')) {
    slackConfig = config.slack;
  } else {
    return;
  }
  logger.info('Sending notification');
  request.post(slackConfig.webhookUrl, {
      form: {
        payload: JSON.stringify({
          channel: slackConfig.channel,
          icon_emoji: slackConfig.icon,
          username: slackConfig.username,
          text: message
        })
      }
    }, function (err, response) {
      if (err) {
        logger.info('Error sending Slack Notification', err);
        return
      }
      if (response.body !== 'ok') {
        logger.info('Error sending Slack Notification: %s', response.body);
        return
      }
      logger.info('Slack Notification send');
    }
  );
}

function buildProject(project) {
  logger.info('Executing build');
  q.push(function (cb) {
    var timer = timeStart();
    var path = getProjectPath(project);
    var fullEnv = Object.create(process.env);
    try {
      var env = dotenv.parse(fs.readFileSync(path + '/.env'));
    } catch (e) {
      var env = {};
    }
    for (var k in env) {
      if (env.hasOwnProperty(k)) {
        fullEnv[k] = env[k];
      }
    }

    //Git environment variables
    /*fullEnv["GIT_COMMIT"]
    fullEnv["GIT_BRANCH"]
    fullEnv["GIT_LOCAL_BRANCH"]
    fullEnv["GIT_PREVIOUS_COMMIT"]
    fullEnv["GIT_PREVIOUS_SUCCESSFUL_COMMIT"]
    fullEnv["GIT_URL"]
    fullEnv["GIT_URL_N"]
    fullEnv["GIT_AUTHOR_NAME"]
    fullEnv["GIT_COMMITTER_NAME"]
    fullEnv["GIT_AUTHOR_EMAIL"]
    fullEnv["GIT_COMMITTER_EMAIL"]*/

    fullEnv["PROJECT_PATH"] = path;

    sendNotification(project, project.key + ' started');

    var build = childprocess.spawn('/bin/sh', ['-xe', project.buildScript], {
      cwd: path,
      env: fullEnv
    });

    var stdout = '';
    var stderr = '';

    build.stdout.on('data', function (data) {
      stdout += data.toString();
    });

    build.stderr.on('data', function (data) {
      stderr += data.toString();
    });

    build.on('exit', function (code) {
      var time = timeEnd(timer);
      if (code) {
        logger.info('Error build:', code);
        sendNotification(project, project.key + ' failure in ' + Math.floor(time / 1000) + 's');
        sendNotification(project, 'stdout' + stdout);
        sendNotification(project, 'stderr' + stderr);
      } else {
        logger.info('Build finished, took: %d ms', time);
        sendNotification(project, project.key + ' success in ' + Math.floor(time / 1000) + 's');
      }
      cb();
    });
  });
}
