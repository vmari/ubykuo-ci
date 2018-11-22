ubykuo-ci
=========
Lighweight (~60MB RAM footprint) continuos integration service. A free and open source tool built as an alternative to monstruos Jenkins memory usage when working on resource-constrained environments.


Premises
========

 - Extra lightweight (less 60MB on ram): Jenkins eats more RAM than Chrome on average, even with their workers IDLE.
 - Build steps in source code: don't hide your build files behind build servers and SSH tunnels, let your team embrace DevOps culture and handle the build steps inside the project source.
 - Install & run: install as a .deb package, minimal configuration and run as a service.
 - Webhook first: prioritize Webhook usage over cron.
 - No master-slave architecture
 - GIT repositories & multibranch support
 - Slack notifications

Usage
=====
Create build.sh script in your project
Create .env config file in your project [optional] (will be injected in build script)

Create config.json file in daemon config (/etc/ubykuo-ci/config.json)

```json
{
  "slack": {
    "webhookUrl": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
    "channel": "#builds",
    "username": "ubykuo-ci",
    "icon": ":+1:"
  },
  "webhook": {
    "method": "POST",
    "path": "/myCustomWebHookURI"
  },
  "port": 6666,
  "ssl": true,
  "projects": [
    {
      "key": "my-project-development",
      "repo": {
        "url": "git@github.com:ubykuo/ubykuo-ci.git",
        "branch": "dev"
      },
      "buildScript": "build-dev.sh"
    },
    {
      "key": "my-project-production",
      "repo": {
        "url": "git@github.com:ubykuo/ubykuo-ci.git",
        "branch": "master"
      },
      "buildScript": "build-master.sh"
    }
  ]
}

```


Projects root: /var/lib/ubykuo-ci/workspaces

Allow ssh certificate login in GitHub / BitBucket
=================================================
After config, a new certificate will be created in /home/ubykuo-ci/.ssh/id_rsa

Requirements for building the deb package
==================================
 - sudo apt install dpkg fakeroot jq
 - npm install -g node-deb
 - make build

CLI Commands
============
CLI support is not available yet. But if you want you can help us, we'd love to receive your help.

Managing service on Amazon AMI
=================================================
On Amazon AMI instances, ubykuo-ci uses foreverjs to run the daemon. In case of needing to restart the service you should use the forever command.
```bash
$ cd installation/path
$ forever restart daemon.js
```

n2h
===
HTTPS with let's encrypt
