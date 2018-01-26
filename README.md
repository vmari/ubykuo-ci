ubykuo-ci
=========
A super Simple Scalable Cloud Opinionated lightweight Node.JS deployer to be used with Bitbucket or Github POST transactionals service hooks.


Premises
========

##### Extra lightweight (less 60MB on ram)
Jenkins eats more RAM than Chrome, even with their workers IDLE.
 - Build steps in source code
 - Install .deb package & run
 - run as a service
 - Webhook first
 - no master-slave architecture


Requirements for build deb package
==================================
 - sudo apt install dpkg fakeroot jq
 - npm install -g node-deb
 - make build



CLI Commands
============
    init (default)
    list ls
    remove rm
    
    
    
n2h
===
    https with let's encrypt

