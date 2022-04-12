poi
=====

yay a 2d poi pattern grapher!

hella work in progress

usability tasks
-----
+ [x] selectable patterns
+ [x] split/together/same time selector (pattern phase shift)
+ [x] rotate the graph to make theta=0 point up
+ more patterns. [ideas](https://github.com/infiniteperplexity/visual-spinner-3d/tree/master/json)
+ [x] refactor so the speed is changeable
+ [x] adjustable poi to arm ratio
+ [x] urlparams for permalinking
+ [ ] make urlparams more concise
+ [ ] list directionality and timing next to beat ratio

bugs
-----
+ [ ] when 4-petal anti phase shift is 180, the poi flies off the screen at theta=0
+ [ ] normalize patterns so that phases always start at the same place
+ [ ] 1 poi is always pattern1-colored regardless of whether pattern 1 or pattern 2 is selected

pipe dreams & fun stuff
-----
+ [ ] FORCE DIAGRAMS AND GRAVITY OHHH SNAP
+ [x] beat ratio
+ [x] RAVE MODE
+ [x] allow arbitrary pattern phase shifts and n-flowers (I'm writing the pattern generators pretty modularly so this should follow naturally)
+ [ ] refactor to make specifications for stalls and other directional changes easy, probably some kind of chaining mechanism that auto-normalizes itself to overall period.
+ [ ] idk what if I made a polar equation validator that people could input patterns into so I don't have to figure all of them out myself
+ [x] 2 petal inspin flowers
+ [ ] 2 petal antispin flowers

possibly bad ideas
-----
+ Fourier transform arbitrary shapes into what you have to do with your hands over a long exposure and tell you how many cycles it would take
+ slight hand offsets and positioning relative to body? I want this to make it easier for noobs like me to figure out how their hands should interact with each other especially when crossing over
+ write a constraint solver to animate someone's arms attached to the handles? this would be fun and silly but might discourage creativity and good body movement
+ implement "your arms can't do that" detector (involves reverse engineering sneaky ways in which people fold poi around their bodies)
