build: install
	node-deb -- daemon.js ubykuo-ci configJsonSchema.json scripts

docker: build
	sudo docker build -t ubykuo-ci .

install:
	npm install

clean:
	rm -rf *.deb node_modules

all: build