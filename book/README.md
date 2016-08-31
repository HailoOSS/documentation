# H2 Micro-Services Platform

H2 is the name of the platform that powers the entirety of Hailo, this includes the code for business logic, automation and all of the shared infrastructure. 

As mentioned in the title H2 is a micro-services platform which means that the logic is split into small programs which can (and will!) have multiple running instances on multiple instances. These services talk between each other using RPC.

This documentation aims to explain how to create services which will run on the H2 platform and also what all the different parts of the shared infrastructure does and how they can be used.
