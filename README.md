# Cloud Application

Running the cloud application is as simple as installed Node.JS and NPM. Check that the software has been correctly added to your path and then run *'npm install'* to retrieve the packages required to run. Some packages require the tool *'git'* so please make sure this is installed and can be reached from the terminal (on windows Git will not be accessible in the command prompt by default, please use the Git Bash terminal instead to run the NPM install).

The service can be ran from the top directory using the command *'node bin/www'* this will configure all environment settings as required and load the system on port 3000. Port 4201 must also be free for use by the web socket server.