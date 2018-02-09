ubykuo-ci
=========
Lighweight (~60MB RAM footprint) continuos integration service.
A free and open source tool built as an alternative to monstruos Jenkins memory usage when working on resource-constrained environments.


Premises
========

 - Extra lightweight (less 60MB on ram): Jenkins eats more RAM than Chrome on average, even with their workers IDLE.
 - Build steps in source code: don't hide your build files behind build servers and SSH tunnels, let your team embrace DevOps culture and handle the build steps inside the project source.
 - Install & run: install as a .deb package, minimal configuration and run as a service.
 - Webhook first: prioritize Webhook usage over cron.
 - No master-slave architecture


Requirements for building deb package
==================================
 ```
 $ sudo apt install dpkg fakeroot jq
 $ npm install -g node-deb
 $ make build
 ```


CLI Commands
============
    init (default)
    list ls
    remove rm
    
    
    
Roadmap
===
- HTTPS with let's encrypt
- Easier setup with interactive configuration

