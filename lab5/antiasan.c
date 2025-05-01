#include <string.h>

void antiasan(unsigned long addr)
{
    extern char gS[];
   
    unsigned long gS_addr = (unsigned long)gS;
    unsigned long shadow_addr = (gS_addr >> 3) + 0x7fff8000;
    
    unsigned char *shadow = (unsigned char *)shadow_addr;

    for (int i = 0; i < 5; i++) {
        shadow[i] = 0;  
    }
}
